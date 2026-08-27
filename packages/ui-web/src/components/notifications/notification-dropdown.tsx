import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatRelativeTime } from "../../utils/format-relative-time";
import {
  selectMenuVariants,
  selectMenuTransition,
} from "../../lib/motion/variants";
import { iconFor, iconClassFor } from "./notification-icon-map";
import type { NotificationItem } from "./types";

/*
 * The topbar bell's panel: the few most recent notifications, with the full
 * list one click away. Shares the icon map and relative time with
 * NotificationsPage so the two never drift.
 */

export interface NotificationDropdownProps {
  isOpen: boolean;
  items: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  onItemClick?: (item: NotificationItem) => void;
  /** Which edge to pin to. The bell sits at the right of the topbar. */
  align?: "left" | "right";
}

export function NotificationDropdown({
  isOpen,
  items,
  unreadCount,
  onMarkAsRead,
  onMarkAllRead,
  onViewAll,
  onItemClick,
  align = "right",
}: NotificationDropdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={selectMenuVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={selectMenuTransition}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "border-line absolute top-[calc(100%+8px)] z-50 flex w-[22rem] origin-top flex-col overflow-hidden rounded-2xl border bg-white shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="border-line flex items-center justify-between border-b px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="font-syne text-heading text-sm font-semibold">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-primary rounded-full px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-body hover:text-heading flex cursor-pointer items-center gap-1 text-xs font-medium transition-colors"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-body px-4 py-10 text-center text-sm">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((item) => {
                const Icon = iconFor(item.type);
                const isUnread = item.status === "unread";

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnread) onMarkAsRead(item.id);
                        onItemClick?.(item);
                      }}
                      className={cn(
                        "border-line flex w-full cursor-pointer items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-black/5",
                        isUnread && "bg-dash-quick-action-hover",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          iconClassFor(item.type),
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-heading truncate text-sm",
                              isUnread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="text-icon-secondary mt-0.5 shrink-0 text-[10px] tabular-nums">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </span>
                        <span className="text-body line-clamp-2 text-xs leading-relaxed">
                          {item.description}
                        </span>
                      </span>
                      {isUnread && (
                        <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-line border-t px-4 py-3">
            <button
              type="button"
              onClick={onViewAll}
              className="text-primary flex w-full cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
            >
              View all notifications <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

NotificationDropdown.displayName = "NotificationDropdown";
