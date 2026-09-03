import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Package,
  AlertCircle,
} from "lucide-react";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "../../contexts/AuthContext";
import {
  setPostAuthRedirect,
  clearPostAuthRedirect,
} from "../../utils/auth-redirect";
import { BASE_BACKEND_URL } from "@debridgers/api-client";
import { useCart } from "../../features/cart";
import {
  Pagination,
  ProductCard,
  formatCurrency,
  categoryFilterChips,
  ALL_CATEGORIES,
  useDialog,
  SearchInputField,
} from "@debridgers/ui-web";

import { marketingNavLinks } from "@/components/marketing/data/data";
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

// === Public Shop
export default function PublicShop() {
  const {
    items: cart,
    subtotal: cartTotal,
    addItem,
    updateQuantity: updateQty,
    removeItem,
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

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
   * The marketing shop is browse-and-collect: it fills the cart, gates on auth,
   * and hands over. Paystack already returns every buyer to
   * /buyer-dashboard/checkout (see payment.service.ts and
   * buyer-payment.service.ts, which both set that callback_url), so the second
   * checkout that used to live here could take a payment it could never
   * confirm. It has been removed rather than kept in step by hand.
   *
   * The cart travels by itself - CartProvider persists it and merges it with
   * the server copy once the session exists.
   */
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
        <Header
          navLinks={marketingNavLinks}
          signUpHref="/signup"
          dashboardPath={dashboardPath}
          isAuthenticated={isAuthenticated}
          surface="solid"
          /* The cart bar sits in the flow below the catalogue, which grows with
             the product count, so it is out of reach on any real page of
             products. The header is the one thing always on screen. */
          cartCount={cartProductCount}
          onCartClick={() => setCartOpen(true)}
          /* Order Now defaults to WhatsApp, which is wrong on the one page with
             a live cart in it. */
          orderNowHref="#top"
        />

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
                <p className="text-body text-sm">
                  Add items to cart, you only need an account when you&apos;re
                  ready to checkout.
                </p>
              </div>

              {/* Search */}
              <SearchInputField
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
                          : "border-line text-heading bg-white"
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
                        className="bg-line h-64 animate-pulse rounded-2xl"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="flex flex-col items-center gap-3 py-20">
                    <AlertCircle size={48} className="text-body opacity-30" />
                    <p className="text-body text-sm">{loadError}</p>
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
                    <Package size={48} className="text-body opacity-20" />
                    <p className="text-body text-sm">
                      No products available yet.
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-body py-10 text-center text-sm">
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
                  className="border-line relative z-30 w-full border-t bg-white"
                >
                  <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto flex w-full items-center justify-between py-4">
                    <div>
                      <p className="text-body text-sm">
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
                        className="border-line text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
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
                    <div className="border-line flex shrink-0 items-center justify-between border-b px-5 py-4">
                      <h3 className="font-syne text-heading font-bold">
                        Your cart ({cartProductCount})
                      </h3>
                      <button
                        onClick={() => setCartOpen(false)}
                        className="cursor-pointer rounded-full p-1.5 hover:bg-black/5"
                      >
                        <X size={18} className="text-body" />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="border-line flex items-center gap-3 rounded-xl border p-3"
                        >
                          <div className="bg-light-bg h-12 w-12 shrink-0 overflow-hidden rounded-lg">
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
                                  className="text-body opacity-20"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="text-heading truncate text-sm font-medium">
                              {item.name}
                            </p>
                            <p className="text-body text-xs">
                              {item.unit} · {formatCurrency(item.price)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="border-line flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-heading w-5 text-center text-sm font-semibold">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="border-line flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
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

                    <div className="border-line flex shrink-0 flex-col gap-3 border-t p-5">
                      <div className="flex justify-between">
                        <span className="text-body text-sm">Total</span>
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
          </div>
          {/* end section-max-width wrapper */}
        </section>
      </div>
      {/* end flex h-screen flex-col */}
    </>
  );
}
