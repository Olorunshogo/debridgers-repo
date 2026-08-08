import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { formatFromKobo } from "@debridgers/ui-web";

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
    orderId: `#DBR-${String(o.id).padStart(4, "0")}`,
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
    bgClass: "bg-status-on-the-way-bg",
    textClass: "text-status-on-the-way-text",
    label: "On the way",
  },
  pending: {
    bgClass: "bg-status-pending-bg",
    textClass: "text-status-pending-text",
    label: "Pending",
  },
  confirmed: {
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    label: "Paid",
  },
  delivered: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "✓ Delivered",
  },
  cancelled: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "✕ Cancelled",
  },
};

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Order | null>(null);

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
                : "bg-bg-light text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-gray-border text-text grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-semibold tracking-wider uppercase">
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
                className={`border-gray-border h-14 animate-pulse border-b ${i % 2 === 0 ? "bg-bg-light" : "bg-white"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text py-12 text-center text-sm">
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
                    className="border-gray-border hover:bg-dash-quick-action-hover grid cursor-pointer grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-6 py-4 text-sm transition-colors last:border-0"
                  >
                    <span className="text-heading font-mono text-xs">
                      {order.orderId}
                    </span>
                    <span className="text-text">{order.items}</span>
                    <span className="text-text">{order.date}</span>
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
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="bg-primary rounded-full px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80"
                        >
                          Track
                        </button>
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
              onClick={() => setSelected(null)}
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
                  <p className="text-text text-sm">{selected.items}</p>
                  <p className="text-text text-sm">{selected.date}</p>
                  <p className="font-syne text-heading mt-2 text-2xl font-bold">
                    {selected.amount}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-icon-secondary rounded-full p-1.5 transition-colors"
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
                  <button className="bg-primary rounded-full px-3 py-1 text-xs font-medium text-white">
                    Track
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
