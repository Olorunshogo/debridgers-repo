import { motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";

export function meta() {
  return [{ title: "Notifications | Debridgers" }];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Report Approved",
    message: "Your daily report for Apr 5 has been approved.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    title: "Commission Paid",
    message: "₦27,000 commission has been credited to your wallet.",
    time: "5h ago",
    read: false,
  },
  {
    id: "n3",
    title: "Stock Request Update",
    message: "Your stock request has been approved and dispatched.",
    time: "1d ago",
    read: true,
  },
  {
    id: "n4",
    title: "Report Rejected",
    message: "Your report for Apr 2 was rejected. Please resubmit.",
    time: "2d ago",
    read: true,
  },
];

export default function AgentNotificationPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={24} style={{ color: "var(--primary-color)" }} />
          <div>
            <h2
              className="font-syne text-xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Notifications
            </h2>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              Stay up to date with your activity
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--primary-color)" }}
        >
          <CheckCheck size={16} />
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {MOCK_NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-4 border-b px-5 py-4 last:border-0"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: n.read ? "transparent" : "var(--bg-light)",
            }}
          >
            <div
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: n.read
                  ? "transparent"
                  : "var(--primary-color)",
              }}
            />
            <div className="flex flex-col gap-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {n.title}
              </p>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                {n.message}
              </p>
              <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                {n.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
