import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";

export function meta() {
  return [{ title: "Shop / Catalog | Debridger" }];
}

type Category = "all" | "grains" | "tuber" | "oil";

interface Product {
  id: string;
  name: string;
  category: string;
  categoryKey: Category;
  price: number;
  unit: string;
  image: string;
  bestSelling: boolean;
}

interface CartItem extends Product {
  qty: number;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Parboiled Rice",
    category: "Grains & Staples",
    categoryKey: "grains",
    price: 1200,
    unit: "per kg",
    image: "/images/deliver-grains-staples-1.jpg",
    bestSelling: true,
  },
  {
    id: "2",
    name: "Brown Beans",
    category: "Grains & Staples",
    categoryKey: "grains",
    price: 800,
    unit: "per kg",
    image: "/images/deliver-grains-1.jpg",
    bestSelling: true,
  },
  {
    id: "3",
    name: "Groundnut Oil",
    category: "Oil",
    categoryKey: "oil",
    price: 2500,
    unit: "per liter",
    image: "/images/deliver-oil-protein-1.jpg",
    bestSelling: false,
  },
  {
    id: "4",
    name: "Yam",
    category: "Tubers",
    categoryKey: "tuber",
    price: 600,
    unit: "per kg",
    image: "/images/deliver-tubers-1.jpg",
    bestSelling: true,
  },
  {
    id: "5",
    name: "Garri",
    category: "Grains & Staples",
    categoryKey: "grains",
    price: 400,
    unit: "per kg",
    image: "/images/deliver-grains-staples-2.jpg",
    bestSelling: false,
  },
  {
    id: "6",
    name: "Palm Oil",
    category: "Oil",
    categoryKey: "oil",
    price: 1800,
    unit: "per liter",
    image: "/images/deliver-oil-protein-2.jpg",
    bestSelling: true,
  },
  {
    id: "7",
    name: "Irish Potato",
    category: "Tubers",
    categoryKey: "tuber",
    price: 500,
    unit: "per kg",
    image: "/images/deliver-tubers-2.jpg",
    bestSelling: false,
  },
  {
    id: "8",
    name: "Soya Beans",
    category: "Grains & Staples",
    categoryKey: "grains",
    price: 900,
    unit: "per kg",
    image: "/images/deliver-grains-2.jpg",
    bestSelling: false,
  },
  {
    id: "9",
    name: "Sweet Potato",
    category: "Tubers",
    categoryKey: "tuber",
    price: 450,
    unit: "per kg",
    image: "/images/deliver-tubers-3.jpg",
    bestSelling: false,
  },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "grains", label: "Grains" },
  { key: "tuber", label: "Tuber" },
  { key: "oil", label: "Oil" },
];

function fmt(n: number) {
  return "N" + n.toLocaleString();
}

export default function BuyerShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      const init: Record<string, number> = {};
      MOCK_PRODUCTS.forEach((p) => {
        init[p.id] = 1;
      });
      setQtys(init);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? products
        : products.filter((p) => p.categoryKey === activeCategory),
    [products, activeCategory],
  );

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(product: Product) {
    const qty = qtys[product.id] ?? 1;
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qty } : i,
        );
      return [...prev, { ...product, qty }];
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
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor:
                activeCategory === cat.key
                  ? "var(--primary-color)"
                  : "var(--bg-light)",
              color:
                activeCategory === cat.key ? "white" : "var(--text-colour)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl"
              style={{ backgroundColor: "var(--border-gray)" }}
            />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          >
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--white)",
                }}
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://placehold.co/300x150/e8f5e9/1e5925?text=" +
                        encodeURIComponent(product.name);
                    }}
                  />
                  <span
                    className="absolute top-2 left-2 rounded-sm px-1.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    {product.categoryKey.charAt(0).toUpperCase() +
                      product.categoryKey.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {product.category}
                  </p>
                  <p
                    className="font-syne text-sm font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {product.name}
                  </p>
                  {product.bestSelling && (
                    <span
                      className="w-fit rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--status-active-bg)",
                        color: "var(--status-active-text)",
                      }}
                    >
                      Best Selling
                    </span>
                  )}
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(product.price)}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      <span>{product.unit}</span>
                      <select
                        value={qtys[product.id] ?? 1}
                        onChange={(e) =>
                          setQtys((p) => ({
                            ...p,
                            [product.id]: Number(e.target.value),
                          }))
                        }
                        className="ml-1 rounded border px-1 py-0.5 text-xs outline-none"
                        style={{ borderColor: "var(--border-gray)" }}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    {cart.find((i) => i.id === product.id) ? (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "var(--primary-color)" }}
                      >
                        <ShoppingCart size={12} />
                        Add to cart
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "var(--primary-color)" }}
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-between border-t px-6 py-4 shadow-lg lg:left-[280px]"
            style={{
              backgroundColor: "var(--white)",
              borderColor: "var(--border-gray)",
            }}
          >
            <div>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                {cartCount} item{cartCount > 1 ? "s" : ""} in cart
              </p>
              <p
                className="font-syne font-bold"
                style={{ color: "var(--primary-color)" }}
              >
                Total: {fmt(cartTotal)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                style={{
                  borderColor: "var(--border-gray)",
                  color: "var(--heading-colour)",
                }}
              >
                <ShoppingCart size={16} />
                View Cart
              </button>
              <Link
                to="/buyer-dashboard/checkout"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                Checkout
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col shadow-2xl"
              style={{ backgroundColor: "var(--white)" }}
            >
              <div
                className="flex items-center justify-between border-b px-6 py-4"
                style={{ borderColor: "var(--border-gray)" }}
              >
                <div className="flex items-center gap-2">
                  <h3
                    className="font-syne font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    Your cart
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "var(--primary-color)" }}
                  >
                    {cartCount}
                  </span>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  style={{ color: "var(--icon-secondary)" }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--heading-colour)" }}
                        >
                          {item.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-colour)" }}
                        >
                          {fmt(item.price)}/{item.unit.replace("per ", "")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border"
                          style={{ borderColor: "var(--border-gray)" }}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-medium">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border"
                          style={{ borderColor: "var(--border-gray)" }}
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-1 rounded-full p-1"
                          style={{
                            color: "var(--status-cancelled-text)",
                            backgroundColor: "var(--status-cancelled-bg)",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="flex flex-col gap-3 border-t px-6 py-5"
                style={{ borderColor: "var(--border-gray)" }}
              >
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "var(--text-colour)" }}
                >
                  <span>Subtotal</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "var(--text-colour)" }}
                >
                  <span>Delivery</span>
                  <span style={{ color: "var(--status-delivered-text)" }}>
                    Free
                  </span>
                </div>
                <div
                  className="font-syne flex justify-between font-bold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  <span>Total</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
                <Link
                  to="/buyer-dashboard/checkout"
                  onClick={() => setCartOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  Checkout online
                </Link>
                <a
                  href="https://wa.me/+2348167042797"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border py-3 text-sm font-medium"
                  style={{
                    borderColor: "var(--border-gray)",
                    color: "var(--heading-colour)",
                  }}
                >
                  Check out through WhatsApp
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
