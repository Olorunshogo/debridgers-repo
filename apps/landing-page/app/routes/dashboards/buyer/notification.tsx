import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function meta() {
  return [{ title: "Notification | Debridger" }];
}

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Your order is on the way!",
    description:
      "Order #AGL-0024 (Rice, Beans, Palm oil) has been picked up and is heading to Barnaw. Est. arrival: today by 5pm.",
    timestamp: "Just now",
    read: false,
  },
  {
    id: "2",
    title: "Order #AGL - 0023 Confirmed",
    description:
      "Your order has been received and is being packed. You'll be notified once it's picked up.",
    timestamp: "2 hours ago",
    read: false,
  },
  {
    id: "3",
    title: "Fresh beans back in stock",
    description:
      "Fresh beans are available this week at ₦1200/kg. Order now before they sell out.",
    timestamp: "Yesterday",
    read: true,
  },
  {
    id: "4",
    title: "Order #AGL-0021 delivered",
    description:
      "Your order was successfully delivered. Enjoy! Let us know if anything was off.",
    timestamp: "Mar 30, 2026",
    read: true,
  },
  {
    id: "5",
    title: "Wallet topped up - ₦10,000",
    description:
      "Your wallet has been credited with ₦10,000 via bank transfer. Now balance ₦15,250.",
    timestamp: "Mar 26, 2026",
    read: true,
  },
];

export default function BuyerNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── PRODUCTION ────────────────────────────────────────────────────────────
    // fetch(`${BASE_BACKEND_URL}/buyer/notifications`, { credentials: "include" })
    //   .then((r) => r.json())
    //   .then((json) => setNotifications(json.data))
    //   .finally(() => setLoading(false));

    // ── MOCK ──────────────────────────────────────────────────────────────────
    const t = setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            className="font-syne text-lg font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Notification
          </h2>
          {unreadCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: "var(--primary-color)" }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {loading ? (
          <div className="flex flex-col gap-0">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse border-b"
                style={{ borderColor: "var(--border-gray)" }}
              />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 border-b px-6 py-5 last:border-0"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: n.read
                    ? "transparent"
                    : "var(--dash-quick-action-hover)",
                }}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex w-3 shrink-0 items-start justify-center">
                  {!n.read && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--primary-color)" }}
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--heading-colour)",
                      fontWeight: n.read ? 400 : 600,
                    }}
                  >
                    {n.title}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {n.description}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--icon-secondary)" }}
                  >
                    {n.timestamp}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
