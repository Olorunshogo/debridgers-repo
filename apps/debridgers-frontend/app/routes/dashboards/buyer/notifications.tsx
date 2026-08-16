import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Notifications | Debridgers" },
    {
      name: "description",
      content:
        "View your order updates, delivery alerts and messages from Debridgers.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/* Mirrors the notifications row the backend returns. */
interface Notification {
  id: number;
  title: string;
  description: string;
  created_at: string;
  read: boolean;
}

const READ_IDS_KEY = "debridgers_read_notif_ids";

function getReadIds(): Set<number> {
  try {
    const stored = localStorage.getItem(READ_IDS_KEY);
    return new Set(stored ? (JSON.parse(stored) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<number>) {
  localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
}

function formatTimestamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BuyerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Notification[]>("/buyer/notifications")
      .then((rows) => {
        const readIds = getReadIds();
        setNotifications(
          rows.map((n) => ({ ...n, read: n.read || readIds.has(n.id) })),
        );
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    saveReadIds(new Set(notifications.map((n) => n.id)));
    localStorage.setItem("debridgers_has_unread", "false");
  }

  function markOneRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const ids = getReadIds();
    ids.add(id);
    saveReadIds(ids);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        "debridgers_has_unread",
        unreadCount > 0 ? "true" : "false",
      );
    }
  }, [unreadCount, loading]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-syne text-heading text-lg font-bold">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="bg-primary rounded-full px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-primary cursor-pointer text-sm font-medium underline underline-offset-2"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        {loading ? (
          <div className="flex flex-col gap-0">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="border-gray-border h-20 animate-pulse border-b"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-text py-12 text-center text-sm">
            No notifications yet. You&apos;ll be notified about your orders
            here.
          </p>
        ) : (
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => markOneRead(n.id)}
                className={`border-gray-border flex cursor-pointer gap-4 border-b px-6 py-5 last:border-0 ${
                  n.read ? "bg-transparent" : "bg-dash-quick-action-hover"
                }`}
              >
                <div className="mt-1.5 flex w-3 shrink-0 items-start justify-center">
                  {!n.read && (
                    <span className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <p
                    className={`text-heading text-sm ${n.read ? "font-normal" : "font-semibold"}`}
                  >
                    {n.title}
                  </p>
                  <p className="text-text text-sm leading-relaxed">
                    {n.description}
                  </p>
                  <p className="text-icon-secondary text-xs">
                    {formatTimestamp(n.created_at)}
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
