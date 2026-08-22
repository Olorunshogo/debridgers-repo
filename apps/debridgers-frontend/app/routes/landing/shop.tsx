import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Header } from "../../components/landing/Header";
import { useAuth } from "../../contexts/AuthContext";
import {
  setPostAuthRedirect,
  clearPostAuthRedirect,
} from "../../utils/auth-redirect";
import {
  BASE_BACKEND_URL,
  apiFetch,
  publicRequest,
} from "@debridgers/api-client";
import {
  useCart,
  LAST_ORDER_STORAGE_KEY,
  type CartItem,
} from "../../features/cart";
import {
  Pagination,
  ProductCard,
  formatCurrency,
  categoryFilterChips,
  ALL_CATEGORIES,
  useDialog,
  DashTextareaInput,
  DashSearchInput,
  DashSelectInput,
  formatFromKobo,
  defaultStateName,
  stateSelectOptions,
  lgaSelectOptions,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Shop Fresh Foodstuff | Debridgers" },
    {
      name: "description",
      content:
        "Browse fresh foodstuff at market prices. Rice, beans, palm oil and more. No account needed to browse. Delivered to your door in Kaduna.",
    },
    {
      name: "keywords",
      content:
        "buy fresh foodstuff online Kaduna, rice beans palm oil delivery Nigeria, affordable groceries Kaduna, fresh produce online Nigeria, Debridgers shop, market price delivery Kaduna",
    },

    // === Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://debridgers.com/shop" },
    { property: "og:site_name", content: "Debridgers" },
    { property: "og:title", content: "Shop Fresh Foodstuff | Debridgers" },
    {
      property: "og:description",
      content:
        "Browse fresh foodstuff at market prices. Rice, beans, palm oil and more. No account needed to browse. Serving Kaduna.",
    },
    { property: "og:image", content: "https://debridgers.com/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Fresh foodstuff at market prices in Kaduna, shop on Debridgers",
    },
    { property: "og:locale", content: "en_NG" },

    // === Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@debridgers" },
    { name: "twitter:url", content: "https://debridgers.com/shop" },
    { name: "twitter:title", content: "Shop Fresh Foodstuff | Debridgers" },
    {
      name: "twitter:description",
      content:
        "Browse fresh foodstuff at market prices. Rice, beans, palm oil and more. No account needed to browse. Serving Kaduna.",
    },
    { name: "twitter:image", content: "https://debridgers.com/og-image.png" },
    {
      name: "twitter:image:alt",
      content: "Fresh foodstuff at market prices in Kaduna, shop on Debridgers",
    },

    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "index, follow" },
  ];
}

interface ApiProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
}

const ITEMS_PER_PAGE = 12;

/* Checkout lives in the dashboard. Paystack returns every buyer here too - see
   payment.service.ts on the backend - so this is the one checkout there is. */
const CHECKOUT_PATH = "/buyer-dashboard/checkout";

interface DeliveryZone {
  id: number;
  name: string;
  delivery_fee: number;
  free_delivery: boolean;
  areas: string[];
}

/* Mirrors the quote endpoint's response - see delivery-fee.ts on the backend. */
interface OrderQuote {
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  freeDelivery: boolean;
  extraPackages: number;
  package_count: number;
}

/* Long enough that changing zone or quantity a few times is one request. */
const QUOTE_DEBOUNCE_MS = 400;

// === CheckoutView
type CheckoutStep = "delivery" | "confirmed";

interface CheckoutViewProps {
  cartItems: CartItem[];
  onBack: () => void;
  onConfirmed: () => void;
}

function CheckoutView({ cartItems, onBack, onConfirmed }: CheckoutViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { triggerDialog } = useDialog();
  const [step, setStep] = useState<CheckoutStep>("delivery");
  /* Verifying the Paystack return, distinct from submitting a new order. */
  const [confirming, setConfirming] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<"today" | "tomorrow">(
    "today",
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  /* State is fixed to the launch state by default; LGA narrows the zone list. */
  const [stateName, setStateName] = useState<string>(defaultStateName);
  const [lga, setLga] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  /* Kept while a new quote is in flight so the totals never flash empty. */
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  /* Read inside the confirmation effect, which must not re-run as the cart
     changes or it would fire a second confirmation mid-flight. */
  const cartItemsRef = useRef<CartItem[]>(cartItems);
  cartItemsRef.current = cartItems;

  /* References already sent for confirmation. Guards against a second POST if
     the effect is re-armed before the URL is cleaned up. */
  const handledRefs = useRef<Set<string>>(new Set());

  /*
   * Return leg from Paystack. Arriving here proves the buyer came back, not
   * that they paid - Paystack sends the same callback when a card is declined
   * or the page is abandoned. So the reference is confirmed with the server
   * before anything is treated as bought, and the cart survives a failure.
   */
  useEffect(() => {
    const ref = searchParams.get("trxref") ?? searchParams.get("reference");
    if (!ref || handledRefs.current.has(ref)) return;
    handledRefs.current.add(ref);

    let cancelled = false;
    setConfirming(true);

    apiFetch<{ order_id: number; payment_status: string }>(
      "/buyer/orders/confirm-payment",
      { method: "POST", body: JSON.stringify({ reference: ref }) },
    )
      .then(() => {
        if (cancelled) return;
        /* Snapshot before clearing so "repeat last order" has something to
           restore. Taken from the shared cart rather than re-reading storage. */
        if (cartItemsRef.current.length > 0) {
          localStorage.setItem(
            LAST_ORDER_STORAGE_KEY,
            JSON.stringify(cartItemsRef.current),
          );
        }
        onConfirmed();
        setStep("confirmed");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error && err.message
            ? err.message
            : "We could not confirm that payment. Your cart has been kept.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setConfirming(false);
        /* Drop the reference so a refresh cannot replay this confirmation. */
        setSearchParams(
          (params) => {
            params.delete("trxref");
            params.delete("reference");
            return params;
          },
          { replace: true },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, onConfirmed]);

  // === Delivery zones
  useEffect(() => {
    publicRequest<DeliveryZone[]>("/zones")
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  /*
   * Zones that serve the chosen LGA. The seeded zones are named after LGAs
   * ("Kaduna South") and also list their areas, so match on either - the same
   * rule the backend uses to resolve a zone, kept in step deliberately.
   */
  const zonesForLga = useMemo(() => {
    if (!lga) return [];
    const target = lga.trim().toLowerCase();
    return zones.filter(
      (zone) =>
        zone.name.trim().toLowerCase() === target ||
        zone.areas.some((area) => area.trim().toLowerCase() === target),
    );
  }, [zones, lga]);

  /* Auto-select the only serving zone, and drop a stale one when LGA changes. */
  useEffect(() => {
    if (zonesForLga.length === 1) {
      setZoneId(String(zonesForLga[0].id));
      return;
    }
    setZoneId((current) =>
      zonesForLga.some((z) => String(z.id) === current) ? current : "",
    );
  }, [zonesForLga]);

  /*
   * Live quote. The server owns the pricing - delivery is a zone base plus a
   * per-package charge, and a promo can zero it - so the summary asks rather
   * than recomputing it here and risking a number that differs from the charge.
   */
  useEffect(() => {
    if (!zoneId || cartItems.length === 0) {
      setQuote(null);
      return;
    }

    setQuoting(true);
    const timer = window.setTimeout(() => {
      apiFetch<OrderQuote>("/buyer/cart/quote", {
        method: "POST",
        body: JSON.stringify({
          zone_id: Number(zoneId),
          cart: cartItems.map((i) => ({
            product_id: Number(i.id),
            qty: i.qty,
          })),
        }),
      })
        .then((next) => {
          setQuote(next);
          setQuoteError(null);
        })
        .catch((err: unknown) => {
          setQuoteError(
            err instanceof Error
              ? err.message
              : "Could not price this order right now.",
          );
        })
        .finally(() => setQuoting(false));
    }, QUOTE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [zoneId, cartItems]);

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  function formatNaira(n: number) {
    return formatCurrency(n);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0 || !deliveryAddress.trim() || !zoneId) return;
    setError(null);
    setLoading(true);
    try {
      /*
       * Step one: reserve the order. It is created pending and unpaid, priced
       * entirely server-side, and the buyer picks a payment method next.
       *
       * Prices are deliberately not sent. The server reads them from the
       * products table, so anything quoted here would be ignored.
       */
      const order = await apiFetch<{
        order_id: number;
        items_total_kobo: number;
        delivery_fee_kobo: number;
        handling_fee_kobo: number;
        total_kobo: number;
      }>("/buyer/orders", {
        method: "POST",
        body: JSON.stringify({
          delivery_address: deliveryAddress.trim(),
          zone_id: Number(zoneId),
          delivery_time: deliveryTime,
          notes: note.trim() || undefined,
          cart: cartItems.map((i) => ({
            product_id: Number(i.id),
            qty: i.qty,
          })),
        }),
      });

      /* Balance is read here rather than in the dialog so the options render
         already knowing whether the wallet can cover the total. */
      let walletBalanceKobo = 0;
      try {
        const wallet = await apiFetch<{
          wallet: { available_balance: number };
        }>("/buyer/wallet");
        walletBalanceKobo = wallet?.wallet?.available_balance ?? 0;
      } catch {
        /* A wallet we cannot read is a wallet the buyer cannot spend from.
           Paystack stays available, so this is not worth failing checkout for. */
      }

      setLoading(false);
      triggerDialog("PAYMENT_METHOD", {
        orderId: order.order_id,
        itemsTotalKobo: order.items_total_kobo,
        deliveryFeeKobo: order.delivery_fee_kobo,
        handlingFeeKobo: order.handling_fee_kobo,
        totalKobo: order.total_kobo,
        walletBalanceKobo,
        onPaid: () => {
          onConfirmed();
          setStep("confirmed");
        },
      });
      return;
    } catch (err) {
      /* Surface the server's reason where there is one. "Try again" is useless
         advice for "this product is no longer available". */
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not start checkout. Please try again.",
      );
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 size={40} className="text-primary animate-spin" />
        <p className="text-text text-sm">Confirming your payment...</p>
      </div>
    );
  }

  if (step === "confirmed") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <CheckCircle2 size={64} className="text-primary" />
        <h2 className="font-syne text-heading text-2xl font-bold">
          Order Confirmed!
        </h2>
        <p className="text-text max-w-80 text-sm">
          Your payment was received. We&apos;ll notify you when your order is
          picked up.
        </p>
        <button
          onClick={onBack}
          className="bg-primary rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="border-gray-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-text flex cursor-pointer items-center gap-1.5 text-sm hover:opacity-70"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="font-syne text-heading font-bold">Checkout</h2>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_320px]"
        >
          {/* Left: delivery fields */}
          <div className="flex flex-col gap-5">
            <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
              <h3 className="font-syne text-heading font-semibold">
                Delivery Address
              </h3>

              {/* State -> LGA -> Zone, narrowing at each step for a precise address */}
              <div className="grid gap-4 lg:grid-cols-2">
                <DashSelectInput
                  label="State"
                  required
                  value={stateName}
                  options={stateSelectOptions()}
                  onChange={(e) => {
                    setStateName(e.target.value);
                    /* LGAs are state-specific, so a stale one must not survive. */
                    setLga("");
                    setZoneId("");
                  }}
                />

                <DashSelectInput
                  label="LGA"
                  required
                  value={lga}
                  placeholder="Choose your LGA"
                  options={lgaSelectOptions(stateName)}
                  onChange={(e) => setLga(e.target.value)}
                />
              </div>

              <DashSelectInput
                label="Delivery area"
                required
                value={zoneId}
                placeholder={
                  !lga
                    ? "Choose an LGA first"
                    : zonesForLga.length === 0
                      ? "We do not deliver here yet"
                      : "Choose your area"
                }
                disabled={!lga || zonesForLga.length === 0}
                options={zonesForLga.map((zone) => ({
                  value: String(zone.id),
                  label: zone.free_delivery
                    ? `${zone.name} - free delivery`
                    : `${zone.name} - ${formatFromKobo(zone.delivery_fee)}`,
                }))}
                onChange={(e) => setZoneId(e.target.value)}
              />

              {lga && zonesForLga.length === 0 && (
                <p className="text-status-cancelled-text text-xs">
                  We do not deliver to {lga} yet. Pick another LGA or contact
                  support.
                </p>
              )}

              <DashTextareaInput
                label="Full delivery address"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your full delivery address..."
                rows={3}
              />
            </div>

            <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
              <h3 className="font-syne text-heading font-semibold">
                Delivery Time
              </h3>
              <div className="flex gap-3">
                {[
                  {
                    key: "today" as const,
                    label: "Today",
                    sub: "Before 12pm",
                  },
                  {
                    key: "tomorrow" as const,
                    label: "Tomorrow",
                    sub: "Between 9am and 5pm",
                  },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
                      deliveryTime === opt.key
                        ? "border-primary bg-dash-quick-action-hover"
                        : "border-gray-border bg-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryTime"
                      value={opt.key}
                      checked={deliveryTime === opt.key}
                      onChange={() => setDeliveryTime(opt.key)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-heading text-sm font-medium">
                        {opt.label}
                      </p>
                      <p className="text-text text-xs">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <DashTextareaInput
                label="Delivery Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. Call me when you arrive..."
                rows={2}
              />
            </div>
          </div>

          {/* Right: order summary */}
          <div className="border-gray-border flex h-fit flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Order Summary
            </h3>

            <div className="flex flex-col gap-3">
              {cartItems.length === 0 ? (
                <p className="text-text text-sm">
                  Your cart is empty.{" "}
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-primary underline underline-offset-2"
                  >
                    Go back to shop
                  </button>
                </p>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text">
                      {item.name} x{item.qty} {item.unit}
                    </span>
                    <span className="text-heading">
                      {formatNaira(item.price * item.qty)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-gray-border flex flex-col gap-2 border-t pt-3">
                <div className="text-text flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>
                    {quote
                      ? formatFromKobo(quote.itemsTotalKobo)
                      : formatNaira(subtotal)}
                  </span>
                </div>

                {/*
                  Delivery is priced server-side and only known once an area is
                  chosen. Saying "Free" before then, as this used to, showed a
                  total that was not what the buyer went on to be charged.
                */}
                <div className="text-text flex justify-between gap-3 text-sm">
                  <span>
                    Delivery
                    {quote && quote.extraPackages > 0 && (
                      <span className="text-text-placeholder">
                        {" "}
                        ({quote.package_count} packages)
                      </span>
                    )}
                  </span>
                  {!zoneId ? (
                    <span className="text-text-placeholder">
                      Choose an area
                    </span>
                  ) : quote?.freeDelivery ? (
                    <span className="flex items-center gap-1.5">
                      <s className="text-text-placeholder">
                        {formatFromKobo(quote.deliveryFeeBeforePromoKobo)}
                      </s>
                      <span className="text-status-delivered-text font-semibold">
                        FREE
                      </span>
                    </span>
                  ) : quote ? (
                    <span>{formatFromKobo(quote.deliveryFeeKobo)}</span>
                  ) : (
                    <span className="text-text-placeholder">...</span>
                  )}
                </div>

                {quote && (
                  <div className="text-text flex justify-between text-sm">
                    <span>Handling</span>
                    <span>{formatFromKobo(quote.handlingFeeKobo)}</span>
                  </div>
                )}

                <div className="font-syne text-heading flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className={quoting ? "opacity-50" : undefined}>
                    {quote
                      ? formatFromKobo(quote.totalKobo)
                      : formatNaira(subtotal)}
                  </span>
                </div>

                {quoteError && (
                  <p className="text-status-cancelled-text text-xs">
                    {quoteError}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                cartItems.length === 0 ||
                !deliveryAddress.trim() ||
                !zoneId
              }
              className="bg-primary flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Reserving your order..." : "Continue to payment"}
              {!loading && <ArrowRight size={16} />}
            </button>
            <p className="text-text text-center text-xs">
              You&apos;ll choose wallet or card on the next step. Nothing is
              charged until then.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// === Public Shop
export default function PublicShop() {
  const {
    items: cart,
    subtotal: cartTotal,
    addItem,
    updateQuantity: updateQty,
    removeItem,
    clear,
    quantityOf,
  } = useCart();
  const { triggerDialog } = useDialog();

  function addToCart(product: ApiProduct) {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.price_kobo / 100,
      unit: product.unit,
      image_url: product.image_url,
    });
  }

  const { isAuthenticated, isLoading, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Re-open checkout in confirmed state when Paystack redirects back
  useEffect(() => {
    const ref = searchParams.get("trxref") ?? searchParams.get("reference");
    if (ref) setCheckoutOpen(true);
  }, [searchParams]);

  // Load products from public endpoint (no auth required)
  const loadProducts = useCallback((): void => {
    setLoading(true);
    setLoadError(null);
    fetch(`${BASE_BACKEND_URL}/products`)
      .then((r) => {
        if (!r.ok) throw new Error(`Products request failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const rows: unknown = json?.data ?? json;
        setProducts(Array.isArray(rows) ? (rows as ApiProduct[]) : []);
      })
      .catch(() => {
        setProducts([]);
        setLoadError("We could not load the shop. Check your connection.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(
    () => categoryFilterChips(products.map((p) => p.category ?? null)),
    [products],
  );

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All")
      list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, search, activeCategory]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const cartProductCount = cart.length;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  /*
   * Checkout lives in the dashboard, and only there.
   *
   * The landing shop is browse-and-collect: it fills the cart, gates on auth,
   * and hands over. Paystack already returns every buyer to
   * /buyer-dashboard/checkout (see payment.service.ts), so a second checkout
   * out here could take a payment it could never confirm.
   *
   * The cart travels by itself - CartProvider persists it and merges it with
   * the server copy once the session exists.
   */
  function handleCheckoutBack() {
    setCheckoutOpen(false);
    navigate("/shop", { replace: true });
  }

  /* Stable identity: it is a dependency of the confirmation effect, and a new
     function each render would re-arm that effect mid-flight. */
  const handleCheckoutConfirmed = useCallback((): void => {
    clear();
  }, [clear]);

  function handleCheckout() {
    setCartOpen(false);

    if (!isLoading && isAuthenticated) {
      navigate(CHECKOUT_PATH);
      return;
    }

    /* Recorded before the gate opens: email verification comes back through a
       different route than login does, and both read this on the way out. */
    setPostAuthRedirect(CHECKOUT_PATH);

    /* Auth gate runs through the dialog engine - see dialog-registry.ts. */
    triggerDialog("AUTH_GATE", {
      onAuthenticated: () => {
        clearPostAuthRedirect();
        navigate(CHECKOUT_PATH);
      },
    });
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-white">
        {/* Header - outside the relative container so drawer never covers it */}
        <div className="z-40 shrink-0 bg-white pt-3">
          <Header
            navLinks={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              // { label: "Agents", href: "/agents" },
              { label: "Contact Us", href: "/contact" },
            ]}
            signUpHref="/signup"
            dashboardPath={dashboardPath}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <section
          aria-label="Product catalog"
          className="relative flex w-full flex-1 bg-white"
        >
          <div className="section-max-width relative mx-auto flex w-full flex-1 flex-col">
            {/* Page content - grows with the catalogue, no inner scroller */}
            <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg flex flex-1 flex-col gap-6 pt-8 pb-8">
              <div className="flex flex-col gap-2">
                <h1 className="font-syne text-primary text-2xl font-bold sm:text-3xl">
                  Browse our products
                </h1>
                <p className="text-text text-sm">
                  Add items to cart, you only need an account when you&apos;re
                  ready to checkout.
                </p>
              </div>

              {/* Search */}
              <DashSearchInput
                className="w-full"
                placeholder="Search products..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />

              {/* Category pills */}
              {!loading && categories.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        setCurrentPage(1);
                      }}
                      className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        cat === activeCategory
                          ? "border-primary bg-primary text-white"
                          : "border-gray-border text-heading bg-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Product grid */}
              <div className="w-full flex-1">
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-border h-64 animate-pulse rounded-2xl"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="flex flex-col items-center gap-3 py-20">
                    <AlertCircle size={48} className="text-text opacity-30" />
                    <p className="text-text text-sm">{loadError}</p>
                    <button
                      type="button"
                      onClick={loadProducts}
                      className="bg-primary rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Try again
                    </button>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-20">
                    <Package size={48} className="text-text opacity-20" />
                    <p className="text-text text-sm">
                      No products available yet.
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-text py-10 text-center text-sm">
                    No products match &quot;{search}&quot;
                  </p>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
                  >
                    {paginatedProducts.map((product, i) => {
                      const priceNaira = product.price_kobo / 100;
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantityInCart={quantityOf(String(product.id))}
                          formattedPrice={formatCurrency(priceNaira)}
                          animationIndex={i}
                          onAddToCart={() => addToCart(product)}
                          onIncrement={() => updateQty(String(product.id), 1)}
                          onDecrement={() => updateQty(String(product.id), -1)}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {!loading && filtered.length > 0 && totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
            {/* end content */}

            {/* Cart bar - in flow, directly under the catalogue rather than
                pinned to the viewport, so it reads as part of the same panel */}
            <AnimatePresence>
              {cartProductCount > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="border-gray-border relative z-30 w-full border-t bg-white"
                >
                  <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto flex w-full items-center justify-between py-4">
                    <div>
                      <p className="text-text text-sm">
                        {cartProductCount} item
                        {cartProductCount !== 1 ? "s" : ""} in cart
                      </p>
                      <p className="font-syne text-primary font-bold">
                        Total: {formatCurrency(cartTotal)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCartOpen(true)}
                        className="border-gray-border text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                      >
                        <ShoppingCart size={16} /> View Cart
                      </button>
                      <button
                        onClick={handleCheckout}
                        className="bg-primary rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cart drawer */}
            <AnimatePresence>
              {cartOpen && (
                <>
                  <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 cursor-pointer bg-black/40"
                    onClick={() => setCartOpen(false)}
                  />
                  {/* Fixed, not absolute: the wrapper is now taller than the
                      viewport, so an absolute drawer scrolled away with the page.
                      h-dvh over h-screen because on mobile 100vh exceeds what is
                      actually visible, which pushes the checkout button off. */}
                  <motion.div
                    key="panel"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "tween", duration: 0.28 }}
                    className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-110 flex-col bg-white shadow-2xl"
                  >
                    <div className="border-gray-border flex shrink-0 items-center justify-between border-b px-5 py-4">
                      <h3 className="font-syne text-heading font-bold">
                        Your cart ({cartProductCount})
                      </h3>
                      <button
                        onClick={() => setCartOpen(false)}
                        className="cursor-pointer rounded-full p-1.5 hover:bg-black/5"
                      >
                        <X size={18} className="text-text" />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="border-gray-border flex items-center gap-3 rounded-xl border p-3"
                        >
                          <div className="bg-bg-light h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package
                                  size={18}
                                  className="text-text opacity-20"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="text-heading truncate text-sm font-medium">
                              {item.name}
                            </p>
                            <p className="text-text text-xs">
                              {item.unit} · {formatCurrency(item.price)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="border-gray-border flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-heading w-5 text-center text-sm font-semibold">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="border-gray-border flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="ml-1 cursor-pointer rounded-full p-1 hover:bg-red-50"
                            >
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-gray-border flex shrink-0 flex-col gap-3 border-t p-5">
                      <div className="flex justify-between">
                        <span className="text-text text-sm">Total</span>
                        <span className="font-syne text-heading font-bold">
                          {formatCurrency(cartTotal)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setCartOpen(false);
                          handleCheckout();
                        }}
                        className="bg-primary w-full rounded-full py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Checkout panel */}
            <AnimatePresence>
              {checkoutOpen && (
                <motion.div
                  key="checkout"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.28 }}
                  className="absolute inset-0 z-30 cursor-pointer bg-white"
                >
                  <CheckoutView
                    cartItems={cart}
                    onBack={handleCheckoutBack}
                    onConfirmed={handleCheckoutConfirmed}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* end section-max-width wrapper */}
        </section>
      </div>
      {/* end flex h-screen flex-col */}
    </>
  );
}
