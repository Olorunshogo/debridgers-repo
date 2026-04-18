import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function meta() {
  return [
    { title: "My Orders | Debridgers" },
    {
      name: "description",
      content:
        "Track and manage all your Debridgers food orders. View order history and delivery status.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type OrderStatus = "active" | "pending" | "cancelled" | "delivered";
type Tab = "all" | OrderStatus;

interface Order {
  id: string;
  orderId: string;
  items: string;
  date: string;
  amount: string;
  status: OrderStatus;
}

const MOCK_ORDERS: Order[] = [
  {
    id: "1",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦6,800",
    status: "active",
  },
  {
    id: "2",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦5,300",
    status: "delivered",
  },
  {
    id: "3",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦8,800",
    status: "delivered",
  },
  {
    id: "4",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦9,800",
    status: "cancelled",
  },
  {
    id: "5",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦9,200",
    status: "delivered",
  },
  {
    id: "6",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦1,900",
    status: "pending",
  },
  {
    id: "7",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦9,800",
    status: "cancelled",
  },
  {
    id: "8",
    orderId: "#AGL-0024",
    items: "Rice, Beans, Yam, Oil",
    date: "Mar 24, 2026",
    amount: "₦3,500",
    status: "delivered",
  },
];

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<
  OrderStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "var(--status-on-the-way-bg)",
    text: "var(--status-on-the-way-text)",
    label: "On the way",
  },
  pending: {
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    label: "Pending",
  },
  delivered: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "✓ Delivered",
  },
  cancelled: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
    label: "✕ Cancelled",
  },
};

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    // === PRODUCTION
    // fetch(`${BASE_BACKEND_URL}/buyer/orders`, { credentials: "include" })
    //   .then((r) => r.json())
    //   .then((json) => setOrders(json.data))
    //   .finally(() => setLoading(false));

    // === MOCK
    const t = setTimeout(() => {
      setOrders(MOCK_ORDERS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
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
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor:
                activeTab === tab.key
                  ? "var(--primary-color)"
                  : "var(--bg-light)",
              color: activeTab === tab.key ? "white" : "var(--text-colour)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
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
                className="h-14 animate-pulse border-b"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor:
                    i % 2 === 0 ? "var(--bg-light)" : "var(--white)",
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
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
                    className="grid cursor-pointer grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-6 py-4 text-sm transition-colors last:border-0"
                    style={{ borderColor: "var(--border-gray)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--dash-quick-action-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {order.orderId}
                    </span>
                    <span style={{ color: "var(--text-colour)" }}>
                      {order.items}
                    </span>
                    <span style={{ color: "var(--text-colour)" }}>
                      {order.date}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {order.amount}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: s.bg, color: s.text }}
                      >
                        {s.label}
                      </span>
                      {(order.status === "active" ||
                        order.status === "delivered") && (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-full px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "var(--primary-color)" }}
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
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setSelected(null)}
            />
            <motion.div
              key="popover"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
              style={{ backgroundColor: "var(--white)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p
                    className="font-mono text-sm font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {selected.orderId}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {selected.items}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {selected.date}
                  </p>
                  <p
                    className="font-syne mt-2 text-2xl font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {selected.amount}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full p-1.5 transition-colors"
                  style={{ color: "var(--icon-secondary)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: statusStyles[selected.status].bg,
                    color: statusStyles[selected.status].text,
                  }}
                >
                  {statusStyles[selected.status].label}
                </span>
                {(selected.status === "active" ||
                  selected.status === "delivered") && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: "var(--primary-color)" }}
                  >
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
