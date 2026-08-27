import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "@debridgers/ui-web";
import {
  useNotificationsService,
  type NotificationRole,
} from "@/hooks/useNotificationsService";

/*
 * The topbar bell and its panel.
 *
 * Its own component because useNotificationsService cannot be called
 * conditionally: the agent dashboard has no shared service behind it, so the
 * layout renders this only for the roles that do and falls back to a plain
 * link otherwise.
 */
export function NotificationBell({ role }: { role: NotificationRole }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    recent,
    unreadCount,
    onMarkAsRead,
    onMarkAllRead,
    onItemClick,
    listPath,
  } = useNotificationsService({ role });

  useEffect(() => {
    function handleOutside(e: MouseEvent): void {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* Escape closes, which a click-outside handler alone does not give keyboard
     users. */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
        className="relative cursor-pointer rounded-full p-2 transition-colors hover:bg-black/5"
      >
        <Bell size={20} className="text-icon-secondary" />
        {unreadCount > 0 && (
          <span className="bg-error-red absolute top-1.5 right-1.5 h-2 w-2 rounded-full" />
        )}
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        items={recent}
        unreadCount={unreadCount}
        onMarkAsRead={onMarkAsRead}
        onMarkAllRead={onMarkAllRead}
        onItemClick={(item) => {
          setIsOpen(false);
          onItemClick?.(item);
        }}
        onViewAll={() => {
          setIsOpen(false);
          navigate(listPath);
        }}
      />
    </div>
  );
}

NotificationBell.displayName = "NotificationBell";
