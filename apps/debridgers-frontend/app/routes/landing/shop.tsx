import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Package,
  Search,
} from "lucide-react";
import { Header } from "../../components/landing/Header";
import { useAuth } from "../../contexts/AuthContext";
import {
  BASE_BACKEND_URL,
  storeTokens,
  decodeJwtPayload,
} from "@debridgers/api-client";
import type { JwtPayload } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Shop | Debridgers" },
    {
      name: "description",
      content:
        "Browse fresh foodstuff at market prices. Rice, beans, palm oil and more — no account needed to browse.",
    },
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

// ─── Inline Auth Modal ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { login } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");

  // Login state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginApiError, setLoginApiError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupForm, setSignupForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupApiError, setSignupApiError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginApiError(null);
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setLoginErrors(errs);
      return;
    }
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      onSuccess();
    } catch (err) {
      setLoginApiError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupApiError(null);
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setSignupErrors(errs);
      return;
    }
    setSignupLoading(true);
    try {
      const idx = signupForm.fullName.indexOf(" ");
      const first_name =
        idx === -1 ? signupForm.fullName : signupForm.fullName.slice(0, idx);
      const last_name = idx === -1 ? "" : signupForm.fullName.slice(idx + 1);
      const res = await fetch(`${BASE_BACKEND_URL}/auth/register/buyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name,
          last_name,
          email: signupForm.email,
          password: signupForm.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Signup failed.");
      }
      if (json.data?.accessToken) {
        storeTokens(json.data.accessToken, json.data.refreshToken ?? "");
        const decoded = decodeJwtPayload<JwtPayload>(json.data.accessToken);
        void decoded;
      }
      // After signup they may need to verify email; just log them in directly if tokens provided
      if (json.data?.accessToken) {
        onSuccess();
      } else {
        // No token yet (email verification required), close modal and show message
        setSignupApiError(
          "Account created! Check your email to verify, then log in.",
        );
      }
    } catch (err) {
      setSignupApiError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:w-full"
        initial={{ opacity: 0, scale: 0.95, y: "-48%" }}
        animate={{ opacity: 1, scale: 1, y: "-50%" }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-syne text-heading text-xl font-bold">
            Sign in to checkout
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-black/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-4"
            noValidate
          >
            {loginApiError && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {loginApiError}
              </p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="you@example.com"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {loginErrors.email && (
                <p className="text-xs text-red-500">{loginErrors.email}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Your password"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {loginErrors.password && (
                <p className="text-xs text-red-500">{loginErrors.password}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="bg-primary mt-1 w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSignup}
            className="flex flex-col gap-4"
            noValidate
          >
            {signupApiError && (
              <p
                className={`rounded-xl px-4 py-2.5 text-sm ${
                  signupApiError.includes("Check your email")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {signupApiError}
              </p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={signupForm.fullName}
                onChange={(e) =>
                  setSignupForm((p) => ({ ...p, fullName: e.target.value }))
                }
                placeholder="Amina Musa"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {signupErrors.fullName && (
                <p className="text-xs text-red-500">{signupErrors.fullName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={signupForm.email}
                onChange={(e) =>
                  setSignupForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="you@example.com"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {signupErrors.email && (
                <p className="text-xs text-red-500">{signupErrors.email}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="Min 8 chars"
                  className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
                />
                {signupErrors.password && (
                  <p className="text-xs text-red-500">
                    {signupErrors.password}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Confirm
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupForm.confirmPassword}
                  onChange={(e) =>
                    setSignupForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Repeat"
                  className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
                />
                {signupErrors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {signupErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={signupLoading}
              className="bg-primary mt-1 w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {signupLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </motion.div>
    </>
  );
}

// ─── Public Shop ─────────────────────────────────────────────────────────────
export default function PublicShop() {
  const { isAuthenticated, isLoading, dashboardPath } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Load products from public endpoint (no auth required)
  useEffect(() => {
    fetch(`${BASE_BACKEND_URL}/products`)
      .then((r) => r.json())
      .then((json) => {
        const rows: ApiProduct[] = (json.data ?? json) as ApiProduct[];
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

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("debridgers_cart");
      if (saved) setCart(JSON.parse(saved) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("debridgers_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("debridgers_cart");
    }
  }, [cart]);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.description).filter(Boolean)),
    ) as string[];
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All")
      list = list.filter((p) => p.description === activeCategory);
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

  function handleCheckout() {
    if (!isLoading && isAuthenticated) {
      navigate("/buyer-dashboard/checkout");
    } else {
      setAuthModalOpen(true);
    }
  }

  function handleAuthSuccess() {
    setAuthModalOpen(false);
    navigate("/buyer-dashboard/checkout");
  }

  return (
    <>
      {/* Header */}
      <div className="sticky top-3 z-40">
        <Header
          navLinks={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: "Agents", href: "/agents" },
            { label: "Contact Us", href: "/contact" },
          ]}
          signUpHref="/signup"
          dashboardPath={dashboardPath}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="font-syne text-primary text-2xl font-bold sm:text-3xl">
            Browse our products
          </h1>
          <p className="text-text text-sm">
            Add items to cart — you only need an account when you're ready to
            checkout.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-full">
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

        {/* Category pills */}
        {!loading && categories.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
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
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-border h-64 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Package size={48} className="text-text opacity-20" />
            <p className="text-text text-sm">No products available yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text py-10 text-center text-sm">
            No products match &quot;{search}&quot;
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
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
                    {product.description && (
                      <span className="text-heading absolute top-2.5 left-2.5 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                        {product.description}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex flex-col gap-0.5">
                      {product.description && (
                        <p className="text-text text-xs">
                          {product.description}
                        </p>
                      )}
                      <p className="font-syne text-heading text-sm leading-snug font-bold">
                        {product.name}
                      </p>
                    </div>
                    <p className="font-syne text-heading text-lg font-bold">
                      {fmt(priceNaira)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="border-gray-border bg-bg-light text-text shrink-0 rounded-lg border px-2 py-1 text-xs font-medium">
                        {product.unit}
                      </span>
                      <select
                        value={qtys[product.id] ?? 1}
                        onChange={(e) =>
                          setQtys((p) => ({
                            ...p,
                            [product.id]: Number(e.target.value),
                          }))
                        }
                        className="border-gray-border bg-bg-light text-heading rounded-lg border px-2 py-1 text-xs outline-none"
                      >
                        {[1, 2, 3, 4, 5, 10].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-primary ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-85"
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

      {/* Bottom cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="border-gray-border fixed right-0 bottom-0 left-0 z-30 flex items-center justify-between border-t bg-white px-6 py-4 shadow-lg"
          >
            <div>
              <p className="text-text text-sm">
                {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
              </p>
              <p className="font-syne text-primary font-bold">
                Total: {fmt(cartTotal)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="border-gray-border text-heading flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
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
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            >
              <div className="border-gray-border flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-syne text-heading font-bold">
                  Your cart ({cartCount})
                </h3>
                <button
                  onClick={() => setCartOpen(false)}
                  className="rounded-full p-1.5 hover:bg-black/5"
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
                        className="border-gray-border flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-heading w-5 text-center text-sm font-semibold">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="border-gray-border flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-1 rounded-full p-1 hover:bg-red-50"
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

      {/* Auth Modal */}
      <AnimatePresence>
        {authModalOpen && (
          <AuthModal
            onClose={() => setAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
