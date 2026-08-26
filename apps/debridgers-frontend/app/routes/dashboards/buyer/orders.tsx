import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import {
  formatFromKobo,
  DashSubmitButton,
  DashTextareaInput,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "My Orders | Debridgers" },
    {
      name: "description",
      content:
        "Track your current and past Debridgers orders — view status, items and delivery details.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type OrderStatus =
  | "active"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "delivered";
type Tab = "all" | OrderStatus;

interface Order {
  id: string;
  orderId: string;
  items: string;
  date: string;
  amount: string;
  status: OrderStatus;
}

interface ApiOrder {
  id: number;
  order_reference: string;
  status: string;
  payment_status: string;
  total_amount: number;
  quantity: number;
  delivery_address: string;
  created_at: string;
}

function mapApiOrder(o: ApiOrder): Order {
  const dbToUi = (orderStatus: string, paymentStatus: string): OrderStatus => {
    // If payment not made yet, show as pending
    if (paymentStatus === "unpaid") return "pending";

    // If paid but not yet in transit
    if (paymentStatus === "paid" && orderStatus === "confirmed")
      return "confirmed";

    // If out for delivery or delivered
    if (orderStatus === "out_for_delivery") return "active";
    if (orderStatus === "delivered") return "delivered";
    if (orderStatus === "cancelled") return "cancelled";

    return "pending";
  };
  return {
    id: String(o.id),
    orderId: o.order_reference,
    items: `${o.quantity} pack${o.quantity !== 1 ? "s" : ""}`,
    date: new Date(o.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    amount: formatFromKobo(o.total_amount),
    status: dbToUi(o.status, o.payment_status),
  };
}

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<
  OrderStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  active: {
    bgClass: "bg-status-on-the-way",
    textClass: "text-status-on-the-way-fg",
    label: "On the way",
  },
  pending: {
    bgClass: "bg-status-pending",
    textClass: "text-status-pending-fg",
    label: "Pending",
  },
  confirmed: {
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    label: "Paid",
  },
  delivered: {
    bgClass: "bg-status-delivered",
    textClass: "text-status-delivered-fg",
    label: "✓ Delivered",
  },
  cancelled: {
    bgClass: "bg-status-cancelled",
    textClass: "text-status-cancelled-fg",
    label: "✕ Cancelled",
  },
};

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function closeDetail(): void {
    setSelected(null);
    setConfirmingCancel(false);
    setCancelReason("");
    setCancelError(null);
  }

  /*
   * The backend only lets an order be cancelled while it is still unpaid, which
   * maps to the Pending status here. Anything already paid has to go through a
   * refund request instead, so the button is not offered for those.
   */
  async function handleCancel(): Promise<void> {
    if (!selected || cancelReason.trim().length < 5) return;

    setCancelling(true);
    setCancelError(null);

    try {
      await apiFetch(`/buyer/orders/${selected.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === selected.id ? { ...o, status: "cancelled" } : o,
        ),
      );
      closeDetail();
    } catch (err) {
      setCancelError(
        err instanceof Error
          ? err.message
          : "Could not cancel this order. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    apiFetch<ApiOrder[]>("/buyer/orders")
      .then((rows) => setOrders(rows.map(mapApiOrder)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? orders
        : orders.filter((o) => o.status === activeTab),
    [orders, activeTab],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "bg-light-bg text-body"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border-line overflow-hidden rounded-2xl border bg-white">
        <div className="border-line text-body grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-semibold tracking-wider uppercase">
          <span>Order ID</span>
          <span>Items</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border-line h-14 animate-pulse border-b ${i % 2 === 0 ? "bg-light-bg" : "bg-white"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-body py-12 text-center text-sm">
            No orders found.
          </p>
        ) : (
          <AnimatePresence mode="sync">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filtered.map((order, i) => {
                const s = statusStyles[order.status];
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(order)}
                    className="border-line hover:bg-dash-quick-action-hover grid cursor-pointer grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-6 py-4 text-sm transition-colors last:border-0"
                  >
                    <span className="text-heading font-mono text-xs">
                      {order.orderId}
                    </span>
                    <span className="text-body">{order.items}</span>
                    <span className="text-body">{order.date}</span>
                    <span className="text-heading font-semibold">
                      {order.amount}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${s.bgClass} ${s.textClass}`}
                      >
                        {s.label}
                      </span>
                      {(order.status === "active" ||
                        order.status === "delivered") && (
                        <DashSubmitButton
                          variant="primary"
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 text-xs font-medium"
                        >
                          Track
                        </DashSubmitButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Order detail popover */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 cursor-pointer bg-black/30"
              onClick={closeDetail}
            />
            <motion.div
              key="popover"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-175 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-heading font-mono text-sm font-semibold">
                    {selected.orderId}
                  </p>
                  <p className="text-body text-sm">{selected.items}</p>
                  <p className="text-body text-sm">{selected.date}</p>
                  <p className="font-syne text-heading mt-2 text-2xl font-bold">
                    {selected.amount}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  aria-label="Close order details"
                  className="text-icon-secondary cursor-pointer rounded-full p-1.5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[selected.status].bgClass} ${statusStyles[selected.status].textClass}`}
                >
                  {statusStyles[selected.status].label}
                </span>
                {(selected.status === "active" ||
                  selected.status === "delivered") && (
                  <DashSubmitButton
                    variant="primary"
                    type="button"
                    className="px-3 py-1 text-xs font-medium"
                  >
                    Track
                  </DashSubmitButton>
                )}
              </div>

              {selected.status === "pending" && (
                <div className="border-line mt-5 flex flex-col gap-3 border-t pt-5">
                  {confirmingCancel ? (
                    <>
                      <DashTextareaInput
                        label="Why are you cancelling?"
                        name="cancelReason"
                        rows={3}
                        placeholder="Let us know so we can improve."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        error={cancelError ?? undefined}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <DashSubmitButton
                          variant="secondary"
                          type="button"
                          disabled={cancelling}
                          onClick={() => setConfirmingCancel(false)}
                          className="text-xs"
                        >
                          Keep order
                        </DashSubmitButton>
                        <DashSubmitButton
                          variant="primary"
                          type="button"
                          loading={cancelling}
                          loadingText="Cancelling..."
                          disabled={cancelReason.trim().length < 5}
                          onClick={handleCancel}
                          className="px-4 py-2 text-xs"
                        >
                          Confirm cancellation
                        </DashSubmitButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <DashSubmitButton
                        variant="secondary"
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        className="w-fit text-xs"
                      >
                        Cancel order
                      </DashSubmitButton>
                      <p className="text-body text-xs">
                        Only unpaid orders can be cancelled here. Once an order
                        is paid, contact support to request a refund.
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
