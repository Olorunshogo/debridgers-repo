import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Minus, Plus, Trash2, Package } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { useCart } from "../../../features/cart";
import { useFavorites } from "../../../features/favorites";
// import { useBuyAgain } from "../../../features/favorites"; // Buy again disabled
import {
  Pagination,
  ProductCard,
  stickyBarVariants,
  springPanel,
  formatCurrency,
  categoryFilterChips,
  ALL_CATEGORIES,
  // formatFromKobo, // only used by the disabled Buy again block
  SearchInputField,
  SortMenu,
  sortProducts,
  useAsyncResource,
  AsyncBoundary,
  type ProductSortKey,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Shop | Debridgers",
    description:
      "Browse and order fresh foodstuff at market prices. Rice, beans, palm oil and more delivered to your door.",
    path: "/shop",
    noIndex: true,
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
}

const ITEMS_PER_PAGE = 12;

export default function BuyerShop() {
  const {
    items: cart,
    itemCount: cartProductCount,
    subtotal: cartTotal,
    addItem,
    updateQuantity: updateQty,
    removeItem,
    quantityOf,
  } = useCart();

  function addToCart(product: ApiProduct) {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.price_kobo / 100,
      unit: product.unit,
      image_url: product.image_url,
    });
  }

  const { isFavorite, toggleFavorite, canFavorite } = useFavorites();
  // const { products: buyAgain, hasHistory } = useBuyAgain(); // Buy again disabled

  const {
    data: productsData,
    error: productsError,
    loading,
    refetch: refetchProducts,
  } = useAsyncResource<ApiProduct[]>(
    (signal: AbortSignal): Promise<ApiProduct[]> =>
      apiFetch<ApiProduct[]>("/products", { signal }),
    [],
  );
  const products: ApiProduct[] = useMemo(
    () => productsData ?? [],
    [productsData],
  );
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState<ProductSortKey>("category");
  const [currentPage, setCurrentPage] = useState<number>(1);

  /*
   * From the real category column, and only chips that have products behind them.
   * This used to derive from `description`, which is unique per product, so every chip matched exactly one item.
   */
  const categories = useMemo(
    () => categoryFilterChips(products.map((p) => p.category ?? null)),
    [products],
  );

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== ALL_CATEGORIES) {
      list = list.filter((p) => p.category === activeCategory);
    }
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

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    // === Relative container
    // So the cart drawer and bottom bar below can use absolute positioning against this shell.
    <div className="relative h-full">
      {/* Scrollable content */}
      <div className="flex h-full flex-col gap-4 overflow-y-auto pb-28">
        {/*
        === Buy again (disabled)
        {hasHistory && (
          <section className="flex flex-col gap-3">
            <h2 className="font-syne text-heading text-base font-bold">
              Buy again
            </h2>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {buyAgain.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    addItem({
                      id: String(product.id),
                      name: product.name,
                      price: product.price_kobo / 100,
                      unit: product.unit,
                      image_url: product.image_url,
                    })
                  }
                  aria-label={`Add ${product.name} to cart`}
                  className="border-line hover:border-primary flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-colors"
                >
                  <div className="bg-light-bg h-20 w-full overflow-hidden rounded-lg">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={20} className="text-body opacity-20" />
                      </div>
                    )}
                  </div>
                  <span className="font-syne text-heading line-clamp-2 text-sm font-semibold">
                    {product.name}
                  </span>
                  <span className="text-body text-xs">
                    Ordered {product.times_ordered}x
                  </span>
                  <span className="font-syne text-heading text-sm font-bold">
                    {formatFromKobo(product.price_kobo)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        */}

        {/* Search bar */}
        <SearchInputField
          className="w-full"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        {/* Category filter pills + sort */}
        {!loading && (categories.length > 1 || products.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                        : "border-line text-heading bg-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
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

        <AsyncBoundary
          loading={loading}
          error={productsError}
          onRetry={refetchProducts}
          isEmpty={products.length === 0}
          skeleton={
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-line h-64 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          }
          empty={
            <div className="flex flex-col items-center gap-3 py-20">
              <Package size={48} className="text-body opacity-20" />
              <p className="text-body text-sm">
                No products available yet. Check back soon.
              </p>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <p className="text-body py-10 text-center text-sm">
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
                    isFavorite={isFavorite(product.id)}
                    onToggleFavorite={
                      canFavorite
                        ? () => void toggleFavorite(product.id)
                        : undefined
                    }
                  />
                );
              })}
            </motion.div>
          )}
        </AsyncBoundary>

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

      {/* === Bottom cart bar */}
      {/* Absolute within the relative shell, so it stays inside the dashboard's bounds instead of spanning the viewport. */}
      <AnimatePresence>
        {cartProductCount > 0 && (
          <motion.div
            variants={stickyBarVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springPanel}
            className="border-line absolute right-0 bottom-0 left-0 z-30 border-t bg-white shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-4 sm:justify-between">
              <div className="flex w-full items-center justify-between gap-4">
                <p className="text-body text-sm">
                  {cartProductCount} item{cartProductCount > 1 ? "s" : ""} in
                  cart
                </p>
                <p className="font-syne text-primary font-bold">
                  Total: {formatCurrency(cartTotal)}
                </p>
              </div>
              <div className="flex w-full justify-end gap-3 sm:w-auto">
                <button
                  onClick={() => setCartOpen(true)}
                  className="border-line text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                >
                  <ShoppingCart size={16} /> View Cart
                </button>
                <Link
                  to="/buyer-dashboard/checkout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Cart drawer */}
      {/* Absolute within this relative container. */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 cursor-pointer bg-black/40"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100vw" }}
              animate={{ x: 0 }}
              exit={{ x: "100vw" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute top-0 right-0 z-50 flex h-full w-full max-w-120 flex-col bg-white shadow-2xl"
            >
              <div className="border-line flex items-center justify-between border-b px-5 py-4">
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

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="border-line flex items-center gap-3 rounded-xl border p-3"
                  >
                    {/* Cart item thumbnail */}
                    <div className="bg-light-bg h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package size={18} className="text-body opacity-20" />
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

              <div className="border-line flex flex-col gap-3 border-t p-5">
                <div className="flex justify-between">
                  <span className="text-body text-sm">Total</span>
                  <span className="font-syne text-heading font-bold">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
                <Link
                  to="/buyer-dashboard/checkout"
                  onClick={() => setCartOpen(false)}
                  target="_blank"
                  rel="noopener noreferrer"
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
