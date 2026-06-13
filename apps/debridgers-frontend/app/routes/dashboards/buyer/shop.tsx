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

export default function BuyerShop() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("debridgers_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("debridgers_cart");
    }
  }, [cart]);

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
    <div className="relative h-full overflow-hidden">
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
            onChange={(e) => setSearch(e.target.value)}
            className="border-gray-border text-heading w-full rounded-xl border bg-white py-2.5 pr-4 pl-10 text-sm outline-none"
          />
        </div>

        {/* Category filter pills */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
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
        )}

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
            className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          >
            {filtered.map((product, i) => {
              const priceNaira = product.price_kobo / 100;
              const inCart = cart.find((c) => c.id === String(product.id));
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-gray-border overflow-hidden rounded-2xl border bg-white"
                >
                  {/* Product image */}
                  <div className="bg-bg-light relative h-44 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={44} className="text-text opacity-15" />
                      </div>
                    )}
                    {/* Category label overlay */}
                    {product.description && (
                      <span className="text-heading absolute top-2.5 left-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                        {product.description}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex flex-col gap-1">
                      <p className="font-syne text-heading text-sm leading-snug font-bold">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-text text-xs">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <p className="font-syne text-heading text-lg font-bold">
                      {fmt(priceNaira)}
                    </p>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Unit pill */}
                      <span className="border-gray-border bg-bg-light text-text shrink-0 rounded-lg border px-2 py-1 text-xs font-medium">
                        {product.unit}
                      </span>

                      {/* Qty stepper */}
                      <div className="border-gray-border flex items-center rounded-lg border">
                        <button
                          onClick={() =>
                            setQtys((prev) => ({
                              ...prev,
                              [product.id]: Math.max(
                                1,
                                (prev[product.id] ?? 1) - 1,
                              ),
                            }))
                          }
                          className="text-heading cursor-pointer px-2 py-1 text-xs hover:opacity-60"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-heading w-5 text-center text-xs font-semibold">
                          {qtys[product.id] ?? 1}
                        </span>
                        <button
                          onClick={() =>
                            setQtys((prev) => ({
                              ...prev,
                              [product.id]: (prev[product.id] ?? 1) + 1,
                            }))
                          }
                          className="text-heading cursor-pointer px-2 py-1 text-xs hover:opacity-60"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Add to cart / Add more */}
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-primary ml-auto flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-85"
                      >
                        {inCart ? (
                          <>
                            <Plus size={11} /> Add more
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={11} /> Add to cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* === Bottom cart bar - absolute so it stays at the visible bottom */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="border-gray-border absolute right-0 bottom-0 left-0 z-30 flex items-center justify-between border-t bg-white px-6 py-4 shadow-lg"
          >
            <div>
              <p className="text-text text-sm">
                {cartCount} item{cartCount > 1 ? "s" : ""} in cart
              </p>
              <p className="font-syne text-primary font-bold">
                Total: {fmt(cartTotal)}
              </p>
            </div>
            <div className="flex gap-3">
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
              className="absolute inset-0 z-40 bg-black/40"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            >
              <div className="border-gray-border flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-syne text-heading font-bold">
                  Your cart ({cartCount})
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
                  className="bg-primary w-full rounded-full py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
