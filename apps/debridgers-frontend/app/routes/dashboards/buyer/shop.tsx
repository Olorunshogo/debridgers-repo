import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Package,
  Search,
} from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { Pagination, ProductCard } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Shop | Debridgers" },
    {
      name: "description",
      content:
        "Browse and order fresh foodstuff at market prices. Rice, beans, palm oil and more delivered to your door.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface ApiProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  qty: number;
}

function fmt(naira: number) {
  return "₦" + naira.toLocaleString("en-NG", { minimumFractionDigits: 0 });
}

const ITEMS_PER_PAGE = 9;

export default function BuyerShop() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Restore cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("debridgers_cart");
      if (saved) setCart(JSON.parse(saved) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    apiFetch<ApiProduct[]>("/buyer/products")
      .then((rows) => {
        setProducts(rows);
        const init: Record<number, number> = {};
        rows.forEach((p) => {
          init[p.id] = 1;
        });
        setQtys(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive categories from description field
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.description).filter(Boolean)),
    ) as string[];
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All") {
      list = list.filter((p) => p.description === activeCategory);
    }
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

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartProductCount = cart.length;

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("debridgers_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("debridgers_cart");
    }
  }, [cart]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  function addToCart(product: ApiProduct) {
    const qty = qtys[product.id] ?? 1;
    const priceNaira = product.price_kobo / 100;
    setCart((prev) => {
      const ex = prev.find((i) => i.id === String(product.id));
      if (ex)
        return prev.map((i) =>
          i.id === String(product.id) ? { ...i, qty: i.qty + qty } : i,
        );
      return [
        ...prev,
        {
          id: String(product.id),
          name: product.name,
          price: priceNaira,
          unit: product.unit,
          image_url: product.image_url,
          qty,
        },
      ];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    // === Relative container so cart drawer can use absolute positioning
    <div className="relative h-full">
      {/* Scrollable content */}
      <div className="flex h-full flex-col gap-4 overflow-y-auto pb-28">
        {/* Search bar */}
        <div className="relative w-full">
          <Search
            size={16}
            className="text-text absolute top-1/2 left-3.5 -translate-y-1/2 opacity-40"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border-gray-border text-heading w-full rounded-xl border bg-white py-2.5 pr-4 pl-10 text-sm outline-none"
          />
        </div>

        {/* Category filter pills */}
        {/* {!loading && categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-gray-border text-heading bg-white"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )} */}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-border h-64 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Package size={48} className="text-text opacity-20" />
            <p className="text-text text-sm">
              No products available yet. Check back soon.
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
            className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {paginatedProducts.map((product, i) => {
              const priceNaira = product.price_kobo / 100;
              const inCart = cart.find((c) => c.id === String(product.id));

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={qtys[product.id] ?? 1}
                  inCart={Boolean(inCart)}
                  formattedPrice={fmt(priceNaira)}
                  animationDelay={i * 0.04}
                  onDecreaseQuantity={() =>
                    setQtys((prev) => ({
                      ...prev,
                      [product.id]: Math.max(1, (prev[product.id] ?? 1) - 1),
                    }))
                  }
                  onIncreaseQuantity={() =>
                    setQtys((prev) => ({
                      ...prev,
                      [product.id]: (prev[product.id] ?? 1) + 1,
                    }))
                  }
                  onAddToCart={() => addToCart(product)}
                />
              );
            })}
          </motion.div>
        )}

        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center pb-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* === Bottom cart bar - absolute so it stays at the visible bottom */}
      <AnimatePresence>
        {cartProductCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="border-gray-border fixed right-0 bottom-0 left-0 z-30 flex flex-wrap items-center justify-center gap-4 border-t bg-white px-6 py-4 shadow-lg sm:justify-between"
          >
            <div className="flex w-full items-center justify-between gap-4">
              <p className="text-text text-sm">
                {cartProductCount} item{cartProductCount > 1 ? "s" : ""} in cart
              </p>
              <p className="font-syne text-primary font-bold">
                Total: {fmt(cartTotal)}
              </p>
            </div>
            <div className="flex w-full justify-end gap-3 sm:w-auto">
              <button
                onClick={() => setCartOpen(true)}
                className="border-gray-border text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
              >
                <ShoppingCart size={16} /> View Cart
              </button>
              <Link
                to="/buyer-dashboard/checkout"
                className="bg-primary rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Checkout
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Cart drawer - absolute within this relative container */}
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
            <motion.div
              key="panel"
              initial={{ x: "100vw" }}
              animate={{ x: 0 }}
              exit={{ x: "100vw" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed top-0 right-0 z-50 flex h-screen w-full max-w-120 flex-col bg-white shadow-2xl"
            >
              <div className="border-gray-border flex items-center justify-between border-b px-5 py-4">
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

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="border-gray-border flex items-center gap-3 rounded-xl border p-3"
                  >
                    {/* Cart item thumbnail */}
                    <div className="bg-bg-light h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package size={18} className="text-text opacity-20" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-heading truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-text text-xs">
                        {item.unit} · {fmt(item.price)} each
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

              <div className="border-gray-border flex flex-col gap-3 border-t p-5">
                <div className="flex justify-between">
                  <span className="text-text text-sm">Total</span>
                  <span className="font-syne text-heading font-bold">
                    {fmt(cartTotal)}
                  </span>
                </div>
                <Link
                  to="/buyer-dashboard/checkout"
                  onClick={() => setCartOpen(false)}
                  className="bg-primary w-full cursor-pointer rounded-full py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
