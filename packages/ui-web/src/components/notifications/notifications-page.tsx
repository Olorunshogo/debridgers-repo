import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, BellOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatRelativeTime } from "../../utils/format-relative-time";
import { staggerItemVariants, staggerDelay } from "../../lib/motion/variants";
import { iconFor, iconClassFor } from "./notification-icon-map";
import type {
  NotificationItem,
  NotificationStatus,
  NotificationsViewProps,
} from "./types";

/*
 * The notifications list, shared by every dashboard.
 *
 * Purely presentational: it takes rows and callbacks and renders them. Each
 * role supplies its own data through useNotificationsService, so adding a role
 * is a wrapper, not a copy of this file.
 */

type FilterTab = "all" | "unread" | "done";

const TABS: readonly { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "done", label: "Done" },
];

const STATUS_LABEL: Record<NotificationStatus, string> = {
  unread: "Unread",
  read: "Read",
  done: "Done",
};

const STATUS_CHIP: Record<NotificationStatus, string> = {
  unread: "bg-status-on-the-way text-status-on-the-way-fg",
  read: "bg-light-bg text-body",
  done: "bg-status-delivered text-status-delivered-fg",
};

function matchesTab(item: NotificationItem, tab: FilterTab): boolean {
  if (tab === "unread") return item.status === "unread";
  if (tab === "done") return item.status === "done";
  return true;
}

export function NotificationsPage({
  notifications,
  loading = false,
  error = null,
  onRetry,
  onMarkAsRead,
  onMarkAsDone,
  onMarkAllRead,
  onItemClick,
}: NotificationsViewProps) {
  const [tab, setTab] = useState<FilterTab>("all");

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => n.status === "unread").length,
      done: notifications.filter((n) => n.status === "done").length,
    }),
    [notifications],
  );

  const visible = useMemo<NotificationItem[]>(
    () => notifications.filter((n) => matchesTab(n, tab)),
    [notifications, tab],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-syne text-heading text-lg font-bold">
            Notifications
          </h2>
          {counts.unread > 0 && (
            <span className="bg-primary rounded-full px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
              {counts.unread > 99 ? "99+" : counts.unread}
            </span>
          )}
        </div>
        {counts.unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="border-line text-body hover:border-input-border-focus hover:text-heading flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-line flex gap-6 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
            className={cn(
              "cursor-pointer pb-3 text-sm font-medium transition-colors duration-300 ease-in-out",
              tab === t.key
                ? "border-primary text-heading border-b-2"
                : "text-body hover:text-heading",
            )}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div className="border-line overflow-hidden rounded-2xl border bg-white">
        {loading ? (
          <div className="flex flex-col">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="border-line bg-light-bg h-20 animate-pulse border-b last:border-0"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-body text-sm">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-primary cursor-pointer text-sm font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            )}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <BellOff size={28} className="text-icon-secondary" />
            <p className="text-heading font-syne font-semibold">
              {tab === "unread" ? "You're all caught up" : "Nothing here"}
            </p>
            <p className="text-body text-sm">
              {tab === "unread"
                ? "Every notification has been read."
                : tab === "done"
                  ? "Notifications you mark as done will collect here."
                  : "You'll be notified here as things happen."}
            </p>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {visible.map((item, i) => {
                const Icon = iconFor(item.type);
                const isUnread = item.status === "unread";
                const clickable = Boolean(onItemClick ?? isUnread);

                return (
                  <motion.li
                    key={item.id}
                    layout
                    variants={staggerItemVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0, height: 0 }}
                    transition={staggerDelay(i, 0.03)}
                    className={cn(
                      "border-line flex items-start gap-4 border-b px-5 py-4 last:border-0",
                      isUnread && "bg-dash-quick-action-hover",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        iconClassFor(item.type),
                      )}
                    >
                      <Icon size={17} />
                    </span>

                    {/*
                     * A button, not a clickable row: the row carries the only
                     * affordance that marks a notification read, so it has to
                     * be reachable by keyboard.
                     */}
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => {
                        if (isUnread) onMarkAsRead(item.id);
                        onItemClick?.(item);
                      }}
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-1 text-left",
                        clickable ? "cursor-pointer" : "cursor-default",
                      )}
                    >
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span
                          className={cn(
                            "text-heading text-sm",
                            isUnread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                              STATUS_CHIP[item.status],
                            )}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                          <span className="text-icon-secondary text-xs tabular-nums">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </span>
                      </span>
                      <span className="text-body text-sm leading-relaxed">
                        {item.description}
                      </span>
                    </button>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(item.id)}
                          className="text-body hover:text-heading cursor-pointer text-[11px] font-medium tracking-wide uppercase transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      {item.status !== "done" && (
                        <button
                          type="button"
                          onClick={() => onMarkAsDone(item.id)}
                          className="text-body hover:text-heading cursor-pointer text-[11px] font-medium tracking-wide uppercase transition-colors"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

NotificationsPage.displayName = "NotificationsPage";
