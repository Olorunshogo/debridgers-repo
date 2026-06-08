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
  { bg: string; text: string; label: string }
> = {
  fulfilled: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "Fulfilled",
  },
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  cancelled: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
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
      <div
        className="flex flex-col gap-6 rounded-2xl border p-6"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne text-lg font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Request new stock
        </h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                backgroundColor: "var(--status-delivered-bg)",
                color: "var(--status-delivered-text)",
              }}
            >
              <CheckCircle2 size={18} /> Stock request submitted! Admin will
              review shortly.
            </motion.div>
          ) : loadingProducts ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl"
                  style={{ backgroundColor: "var(--bg-light)" }}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Package
                size={36}
                className="opacity-30"
                style={{ color: "var(--text-colour)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
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
                <p
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--status-cancelled-bg)",
                    color: "var(--status-cancelled-text)",
                  }}
                >
                  {submitError}
                </p>
              )}

              {/* Product picker */}
              <div className="flex flex-col gap-2">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
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
                        className="flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all"
                        style={{
                          borderColor: selected
                            ? "var(--primary-color)"
                            : "var(--border-gray)",
                          backgroundColor: selected
                            ? "var(--dash-quick-action-hover)"
                            : "var(--bg-light)",
                        }}
                      >
                        <div
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                          style={{ backgroundColor: "var(--white)" }}
                        >
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
                                className="opacity-25"
                                style={{ color: "var(--text-colour)" }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--heading-colour)" }}
                          >
                            {p.name}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-colour)" }}
                          >
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
                  <p
                    className="font-syne text-base font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    How many do you need?
                  </p>
                  <p
                    className="text-center text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {selectedProduct.name} - {selectedProduct.unit} ·{" "}
                    {fmt(selectedProduct.price_kobo)} each (to remit after sale)
                  </p>

                  <div className="bg-bg-light flex w-full max-w-120 items-center justify-between rounded-2xl px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                      style={{
                        borderColor: "var(--border-gray)",
                        backgroundColor: "var(--white)",
                        color: "var(--heading-colour)",
                      }}
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-syne text-heading-colour text-3xl font-bold">
                        {qty}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-colour)" }}
                      >
                        {selectedProduct.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                      style={{
                        borderColor: "var(--border-gray)",
                        backgroundColor: "var(--white)",
                        color: "var(--heading-colour)",
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div
                className="grid grid-cols-2 gap-4 rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-light)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Quantity
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {qty} {selectedProduct?.unit ?? ""}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Amount to remit
                  </p>
                  <p
                    className="font-syne text-lg font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(totalKobo)}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedProduct}
                className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                {loading ? "Submitting..." : "Submit Stock Request"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Right: past requests */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Past Requests
        </h3>

        {loadingRequests ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl"
                style={{ backgroundColor: "var(--bg-light)" }}
              />
            ))}
          </div>
        ) : pastRequests.length === 0 ? (
          <p
            className="py-4 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
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
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {req.product_name} × {req.quantity}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {new Date(req.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {fmt(req.amount_to_remit)}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: s.bg, color: s.text }}
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
