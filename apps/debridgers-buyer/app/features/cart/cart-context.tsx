import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toMinorUnits, useAuth } from "@debridgers/ui-web";
import { syncServerCart, mergeServerCart } from "@debridgers/api-client";

/*
 * One cart, shared by every page that touches it.
 *
 * Previously the marketing shop, the buyer shop, and checkout each kept their own useState over the same localStorage key.
 * They only agreed by accident: moving between them mid-session could show stale contents until a component remounted, and CartItem was declared three separate times.
 *
 * localStorage is the source of truth.
 * When a server-side cart is added later, the local copy still wins on conflict, since it is the one holding writes that have not synced yet.
 */

export const CART_STORAGE_KEY = "debridgers_cart";

/*
 * How long the cart must be still before it is pushed to the server.
 * Long enough that adjusting a quantity a few times is one write, short enough that switching device shortly after feels current.
 */
const SYNC_DEBOUNCE_MS = 2000;

export interface CartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  qty: number;
}

/*
 * `itemCount` is distinct products in the cart; `totalQuantity` is the sum of every line's quantity.
 * `subtotal` is in naira, summed in kobo so it cannot drift.
 * `isHydrated` is true once the cart has been read from storage, for SSR-safe rendering.
 */
export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  replaceItems: (items: CartItem[]) => void;
  clear: () => void;
  quantityOf: (id: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  /*
   * Starts empty rather than reading storage during render: the server has no localStorage, so seeding from it here would produce a hydration mismatch.
   * The first effect fills it in.
   */
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  /* Guards the one-time merge so re-renders cannot re-run it. */
  const hasMergedRef = useRef<boolean>(false);

  useEffect(() => {
    setItems(readStoredCart());
    setIsHydrated(true);
  }, []);

  // Persist, but never before hydration or the first render would wipe storage
  useEffect(() => {
    if (!isHydrated) return;
    if (items.length > 0) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [items, isHydrated]);

  /* Keep other tabs in step - the storage event only fires in other documents. */
  useEffect(() => {
    function handleStorage(event: StorageEvent): void {
      if (event.key !== CART_STORAGE_KEY) return;
      setItems(readStoredCart());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1): void => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number): void => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id: string): void => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const replaceItems = useCallback((next: CartItem[]): void => {
    setItems(next);
  }, []);

  const clear = useCallback((): void => {
    setItems([]);
  }, []);

  /*
   * On login, fold whatever is in localStorage into the account's cart, once.
   * Server-side this takes the higher quantity per line rather than summing.
   */
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || hasMergedRef.current) return;
    hasMergedRef.current = true;

    mergeServerCart(
      items.map((i) => ({ product_id: Number(i.id), quantity: i.qty })),
    )
      .then((merged) => {
        setItems(
          merged.map((line) => ({
            id: String(line.product_id),
            name: line.name,
            price: line.price_kobo / 100,
            unit: line.unit,
            image_url: line.image_url,
            qty: line.quantity,
          })),
        );
      })
      .catch(() => {
        /* Offline or the call failed - localStorage remains authoritative. */
      });
    /* items is deliberately not a dependency: this runs once, on the cart as it stood at login, and re-running on every edit would fight the debounce. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isAuthenticated]);

  /*
   * Debounced push to the server.
   * Only while signed in - an anonymous cart has no owner to key on, which is why there is no guest cart on the backend.
   */
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !hasMergedRef.current) return;

    const timer = window.setTimeout(() => {
      void syncServerCart(
        items.map((i) => ({ product_id: Number(i.id), quantity: i.qty })),
      ).catch(() => {
        /*
         * A failed sync is not user-facing: localStorage still holds the cart and the next edit retries.
         * The endpoint is idempotent.
         */
      });
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [items, isHydrated, isAuthenticated]);

  const quantityOf = useCallback(
    (id: string): number => items.find((i) => i.id === id)?.qty ?? 0,
    [items],
  );

  /*
   * Summed in kobo.
   * `price` is a naira float, so adding `price * qty` across lines accumulates binary rounding error; toMinorUnits recovers exact integers and the division happens once.
   */
  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => sum + toMinorUnits(i.price) * i.qty, 0) / 100,
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      replaceItems,
      clear,
      quantityOf,
    }),
    [
      items,
      subtotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      replaceItems,
      clear,
      quantityOf,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return context;
}
