import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, CheckCircle2, Package } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Request Stock | Debridgers" },
    {
      name: "description",
      content:
        "Request fresh foodstuff stock from the Debridgers warehouse to fulfil your customer orders.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type RequestStatus = "pending" | "fulfilled" | "cancelled";

interface Product {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
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

const statusStyles: Record<
  RequestStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  fulfilled: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "Fulfilled",
  },
  pending: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Pending",
  },
  cancelled: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "Cancelled",
  },
};

function fmt(kobo: number) {
  return (
    "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })
  );
}

export default function AgentRequestStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pastRequests, setPastRequests] = useState<StockRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [productMap, setProductMap] = useState<Record<number, Product>>({});

  useEffect(() => {
    apiFetch<Product[]>("/agent/products")
      .then((rows) => {
        setProducts(rows);
        const map: Record<number, Product> = {};
        rows.forEach((p) => {
          map[p.id] = p;
        });
        setProductMap(map);
        if (rows.length > 0) setSelectedProduct(rows[0] ?? null);
      })
      .catch(() => {})
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitError(null);
    setLoading(true);
    try {
      await apiFetch("/agent/stock/request", {
        method: "POST",
        body: JSON.stringify({ product_id: selectedProduct.id, quantity: qty }),
      });
      setSubmitted(true);
      setQty(1);
      await loadRequests();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Failed to submit. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totalKobo = selectedProduct ? qty * selectedProduct.price_kobo : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Left: form */}
      <div className="border-gray-border flex flex-col gap-6 rounded-2xl border bg-white p-6">
        <h3 className="font-syne text-heading text-lg font-semibold">
          Request new stock
        </h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-status-delivered-bg text-status-delivered-text flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
            >
              <CheckCircle2 size={18} /> Stock request submitted! Admin will
              review shortly.
            </motion.div>
          ) : loadingProducts ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-bg-light h-14 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Package size={36} className="text-text opacity-30" />
              <p className="text-text text-sm">
                No products available. Admin needs to add products first.
              </p>
            </div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {submitError && (
                <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                  {submitError}
                </p>
              )}

              {/* Product picker */}
              <div className="flex flex-col gap-2">
                <p className="text-heading text-sm font-medium">
                  Select product
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {products.map((p) => {
                    const selected = selectedProduct?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setQty(1);
                        }}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                          selected
                            ? "border-primary bg-dash-quick-action-hover"
                            : "border-gray-border bg-bg-light"
                        }`}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package
                                size={18}
                                className="text-text opacity-25"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-heading text-sm font-semibold">
                            {p.name}
                          </span>
                          <span className="text-text text-xs">
                            {p.unit} · {fmt(p.price_kobo)} to remit
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity stepper */}
              {selectedProduct && (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-syne text-heading text-base font-semibold">
                    How many do you need?
                  </p>
                  <p className="text-text text-center text-sm">
                    {selectedProduct.name} - {selectedProduct.unit} ·{" "}
                    {fmt(selectedProduct.price_kobo)} each (to remit after sale)
                  </p>

                  <div className="bg-bg-light flex w-full max-w-120 items-center justify-between rounded-2xl px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="border-gray-border text-heading flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-syne text-heading text-3xl font-bold">
                        {qty}
                      </span>
                      <span className="text-text text-xs">
                        {selectedProduct.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 1)}
                      className="border-gray-border text-heading flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-bg-light grid grid-cols-2 gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-text text-xs">Quantity</p>
                  <p className="font-syne text-heading text-lg font-bold">
                    {qty} {selectedProduct?.unit ?? ""}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-text text-xs">Amount to remit</p>
                  <p className="font-syne text-heading text-lg font-bold">
                    {fmt(totalKobo)}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedProduct}
                className="bg-primary w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Stock Request"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Right: past requests */}
      <div className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">Past Requests</h3>

        {loadingRequests ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-bg-light h-16 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : pastRequests.length === 0 ? (
          <p className="text-text py-4 text-center text-sm">
            No stock requests yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pastRequests.map((req, i) => {
              const s = statusStyles[req.status] ?? statusStyles.pending;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="border-gray-border bg-bg-light flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-heading text-sm font-semibold">
                      {req.product_name} × {req.quantity}
                    </p>
                    <p className="text-text text-xs">
                      {new Date(req.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {fmt(req.amount_to_remit)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bgClass} ${s.textClass}`}
                  >
                    {s.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
