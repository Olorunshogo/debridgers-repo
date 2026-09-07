import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, CheckCircle2, Package, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  formatFromKobo,
  fadeDownVariants,
  transitionBase,
  useDialog,
} from "@debridgers/ui-web";
import {
  StockTaxonomyPicker,
  type TaxonomyNode,
} from "@/components/agent/StockTaxonomyPicker";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Request Stock | Debridgers",
    description:
      "Request fresh foodstuff stock from the Debridgers warehouse to fulfil your customer orders.",
    path: "/request-stock",
    noIndex: true,
  });
}

type RequestStatus = "pending" | "fulfilled" | "cancelled";

interface Product {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  /* Leaf of the taxonomy tree. Null for products not yet categorised. */
  category_id: number | null;
}

interface ApiStockRequest {
  id: number;
  product_id: number | null;
  quantity: number;
  status: string;
  amount_to_remit: number;
  amount_remitted: number;
  created_at: string;
}

interface StockRequest {
  id: string;
  product_name: string;
  quantity: number;
  status: RequestStatus;
  amount_to_remit: number;
  amount_remitted: number;
  created_at: string;
}

interface RequestLineItem {
  product: Product;
  quantity: number;
}

const statusStyles: Record<
  RequestStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  fulfilled: {
    bgClass: "bg-status-delivered",
    textClass: "text-status-delivered-fg",
    label: "Fulfilled",
  },
  pending: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Pending",
  },
  cancelled: {
    bgClass: "bg-status-cancelled",
    textClass: "text-status-cancelled-fg",
    label: "Cancelled",
  },
};

function fmt(kobo: number) {
  return formatFromKobo(kobo);
}

export default function AgentRequestStockPage() {
  const { triggerDialog } = useDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<TaxonomyNode[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  const [requestItems, setRequestItems] = useState<RequestLineItem[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pastRequests, setPastRequests] = useState<StockRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [productMap, setProductMap] = useState<Record<number, Product>>({});

  useEffect(() => {
    /*
     * Products and taxonomy together: the picker needs both to place a product
     * on a branch, and showing a half-loaded tree would hide categories.
     */
    Promise.all([
      apiFetch<Product[]>("/agent/products"),
      apiFetch<TaxonomyNode[]>("/categories"),
    ])
      .then(([rows, categories]) => {
        setProducts(rows);
        setTree(categories);
        const map: Record<number, Product> = {};
        rows.forEach((p) => {
          map[p.id] = p;
        });
        setProductMap(map);
        setSubmitError(null);
      })
      .catch((err) => {
        setSubmitError(
          err instanceof ApiError
            ? err.message
            : "Could not load the product catalogue. Reload the page to retry.",
        );
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  function loadRequests() {
    return apiFetch<ApiStockRequest[]>("/agent/stock")
      .then((rows) =>
        setPastRequests(
          rows.map((r) => ({
            id: String(r.id),
            product_name: r.product_id
              ? (productMap[r.product_id]?.name ?? "Item")
              : "Item",
            quantity: r.quantity,
            status: r.status as RequestStatus,
            amount_to_remit: r.amount_to_remit,
            amount_remitted: r.amount_remitted,
            created_at: r.created_at,
          })),
        ),
      )
      .catch(console.error);
  }

  useEffect(() => {
    loadRequests().finally(() => setLoadingRequests(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productMap]);

  /* The picker owns the drill-down and quantity, so it hands both back here. */
  function addToRequest(product: Product, quantity: number) {
    setRequestItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function removeFromRequest(productId: number) {
    setRequestItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateRequestQty(productId: number, delta: number) {
    setRequestItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const totalRemit = requestItems.reduce(
    (sum, i) => sum + i.product.price_kobo * i.quantity,
    0,
  );

  async function handleSubmit() {
    if (requestItems.length === 0) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Submit each line item as a separate stock request (matches existing API)
      await Promise.all(
        requestItems.map((item) =>
          apiFetch("/agent/stock/request", {
            method: "POST",
            body: JSON.stringify({
              product_id: item.product.id,
              quantity: item.quantity,
            }),
          }),
        ),
      );
      setSubmitted(true);
      setRequestItems([]);
      await loadRequests();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Success banner */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-delivered text-status-delivered-fg flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          >
            <CheckCircle2 size={16} /> Stock request submitted! Admin will
            review shortly.
          </motion.div>
        )}
        {submitError && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm"
          >
            {submitError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left: hierarchical picker */}
        <div className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6">
          <h3 className="font-syne text-heading text-lg font-semibold">
            Request new stock
          </h3>

          {loadingProducts ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-light-bg h-12 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Package size={36} className="text-body opacity-30" />
              <p className="text-body text-sm">
                No products available. Admin needs to add products first.
              </p>
            </div>
          ) : (
            <StockTaxonomyPicker
              tree={tree}
              products={products}
              addedProductIds={requestItems.map((i) => i.product.id)}
              onAdd={addToRequest}
            />
          )}
        </div>

        {/* Right: past requests */}
        <div className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
            Past Requests
          </h3>
          {loadingRequests ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-light-bg h-16 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : pastRequests.length === 0 ? (
            <p className="text-body py-4 text-center text-sm">
              No stock requests yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pastRequests.map((req, i) => {
                const s = statusStyles[req.status] ?? statusStyles.pending;
                const outstanding: number =
                  req.amount_to_remit - req.amount_remitted;
                const canRemit: boolean =
                  req.status === "fulfilled" && outstanding > 0;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="border-line bg-light-bg flex flex-col gap-2 rounded-xl border px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-heading text-sm font-semibold">
                          {req.product_name} × {req.quantity}
                        </p>
                        <p className="text-body text-xs">
                          {new Date(req.created_at).toLocaleDateString(
                            "en-NG",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                          {" · "}
                          {fmt(req.amount_remitted)} /{" "}
                          {fmt(req.amount_to_remit)} remitted
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bgClass} ${s.textClass}`}
                      >
                        {s.label}
                      </span>
                    </div>

                    {canRemit && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerDialog("REMIT_STOCK", {
                            stockRequestId: Number(req.id),
                            productName: req.product_name,
                            amountToRemitKobo: req.amount_to_remit,
                            amountRemittedKobo: req.amount_remitted,
                            onRemitted: () => void loadRequests(),
                          })
                        }
                        className="border-primary text-primary w-fit cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                      >
                        Remit {fmt(outstanding)}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky request cart at bottom */}
      <AnimatePresence>
        {requestItems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="border-line fixed right-4 bottom-0 left-4 z-30 rounded-t-2xl border bg-white shadow-xl lg:left-80"
          >
            <div className="px-4 py-4">
              <div className="flex flex-col gap-3">
                {/* Item list */}
                <div className="flex flex-wrap gap-2">
                  {requestItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="border-line bg-light-bg flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                    >
                      <span className="text-heading font-semibold">
                        {item.product.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateRequestQty(item.product.id, -1)}
                          className="border-line flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border bg-white text-xs"
                        >
                          <Minus size={9} />
                        </button>
                        <span className="text-heading w-4 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateRequestQty(item.product.id, 1)}
                          className="border-line flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border bg-white text-xs"
                        >
                          <Plus size={9} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromRequest(item.product.id)}
                        className="ml-0.5 cursor-pointer text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total + submit */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body text-xs">
                      {requestItems.length} product
                      {requestItems.length !== 1 ? "s" : ""}
                    </p>
                    <p className="font-syne text-heading font-bold">
                      Total to remit: {fmt(totalRemit)}
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-primary cursor-pointer rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {requestItems.length > 0 && <div className="h-28" />}
    </div>
  );
}
