import { useState, useEffect, useMemo, useCallback } from "react";
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
import { buildPageMeta } from "../../lib/seo";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "@debridgers/api-client";
import { computeMeasurePriceKobo } from "@debridgers/pricing";
import { useCart } from "../../features/cart";
import {
  Pagination,
  ProductCard,
  formatCurrency,
  categoryFilterChips,
  ALL_CATEGORIES,
  useDialog,
  SearchInputField,
  SortMenu,
  sortProducts,
  type ProductSortKey,
  type ProductUnitMode,
} from "@debridgers/ui-web";

import { marketingNavLinks } from "@/components/marketing/data/data";
export function meta() {
  return buildPageMeta({
    title: "Shop Fresh Foodstuff | Debridgers",
    description:
      "Browse fresh foodstuff at market prices. Rice, beans, palm oil and more. No account needed to browse. Serving Kaduna.",
    path: "/shop",
    keywords: [
      "buy fresh foodstuff online Kaduna",
      "rice beans palm oil delivery Nigeria",
      "affordable groceries Kaduna",
      "fresh produce online Nigeria",
      "market price delivery Kaduna",
    ],
    imageAlt: "Fresh foodstuff at market prices in Kaduna, shop on Debridgers",
  });
}

interface ApiProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  measure_value?: number | null;
  measure_unit?: string | null;
}

/*
 * Price of one measure, for display only. The real, server-priced total
 * (rounded once, not per unit - see priceBasket on the backend) is what
 * checkout actually charges; this is just what the card shows up front.
 */
function measureUnitPriceKobo(product: ApiProduct): number {
  if (!product.measure_value) return product.price_kobo;
  return computeMeasurePriceKobo({
    packagePriceKobo: product.price_kobo,
    measuresPerPackage: product.measure_value,
    measureQty: 1,
  });
}

const ITEMS_PER_PAGE = 12;

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

  function addToCart(product: ApiProduct, unitMode: ProductUnitMode) {
    const priceKobo =
      unitMode === "measure"
        ? measureUnitPriceKobo(product)
        : product.price_kobo;
    addItem({
      id: String(product.id),
      name: product.name,
      price: priceKobo / 100,
      unit: product.unit,
      image_url: product.image_url,
      unit_mode: unitMode,
      measure_value: product.measure_value,
      measure_unit: product.measure_unit,
    });
  }

  const [unitModeByProduct, setUnitModeByProduct] = useState<
    Record<number, ProductUnitMode>
  >({});

  const { isAuthenticated, dashboardPath } = useAuth();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState<ProductSortKey>("category");
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
    if (activeCategory !== ALL_CATEGORIES)
      list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q),
      );
    }
    return sortProducts(list, sortBy);
  }, [products, search, activeCategory, sortBy]);

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
   * The marketing shop is browse-and-collect: it fills the cart, then hands over to buyer.debridgers.com, which owns both the session and the checkout page.
   * Marketing itself never holds a real buyer session (no shared cookie domain), so this always goes through the cross-subdomain gate rather than branching on a local isAuthenticated that can never be true here - see CheckoutGateDialog for the staged-cart handoff.
   */
  function handleCheckout() {
    setCartOpen(false);
    triggerDialog("CHECKOUT_GATE", { items: cart });
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-white">
        {/*
          cartCount/onCartClick: the cart bar sits in the flow below the catalogue, which grows with the product count, so it is out of reach on any real page of products - the header is the one thing always on screen.
          orderNowHref is overridden to "#top" since Order Now defaults to WhatsApp, which is wrong on the one page with a live cart in it.
        */}
        <Header
          navLinks={marketingNavLinks}
          signUpHref="/signup"
          dashboardPath={dashboardPath}
          isAuthenticated={isAuthenticated}
          surface="solid"
          cartCount={cartProductCount}
          onCartClick={() => setCartOpen(true)}
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

              {/* Category pills + sort */}
              {!loading && (categories.length > 1 || products.length > 0) && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
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
                  <SortMenu
                    value={sortBy}
                    onChange={(next) => {
                      setSortBy(next);
                      setCurrentPage(1);
                    }}
                  />
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
                      const unitMode =
                        unitModeByProduct[product.id] ?? "package";
                      const priceKobo =
                        unitMode === "measure"
                          ? measureUnitPriceKobo(product)
                          : product.price_kobo;
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantityInCart={quantityOf(
                            String(product.id),
                            unitMode,
                          )}
                          formattedPrice={formatCurrency(priceKobo / 100)}
                          animationIndex={i}
                          unitMode={unitMode}
                          onUnitModeChange={(mode) =>
                            setUnitModeByProduct((prev) => ({
                              ...prev,
                              [product.id]: mode,
                            }))
                          }
                          onAddToCart={() => addToCart(product, unitMode)}
                          onIncrement={() =>
                            updateQty(String(product.id), 1, unitMode)
                          }
                          onDecrement={() =>
                            updateQty(String(product.id), -1, unitMode)
                          }
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

            {/* Cart bar - in flow, directly under the catalogue rather than pinned to the viewport, so it reads as part of the same panel */}
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
                  {/* Fixed, not absolute: the wrapper is now taller than the viewport, so an absolute drawer scrolled away with the page. */}
                  {/* h-dvh over h-screen because on mobile 100vh exceeds what is actually visible, which pushes the checkout button off. */}
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
                          key={`${item.id}:${item.unit_mode}`}
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
                              {item.unit_mode === "measure"
                                ? item.measure_unit
                                : item.unit}{" "}
                              · {formatCurrency(item.price)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQty(item.id, -1, item.unit_mode)
                              }
                              className="border-line flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-heading w-5 text-center text-sm font-semibold">
                              {item.qty}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(item.id, 1, item.unit_mode)
                              }
                              className="border-line flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() =>
                                removeItem(item.id, item.unit_mode)
                              }
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
