import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { apiFetch, ApiError } from "@debridgers/api-client";
import type {
  NotificationItem,
  NotificationStatus,
  NotificationsViewProps,
} from "../components/notifications/types";

/*
 * The one place a dashboard talks to the notifications API.
 *
 * Every role gets the same shape back, so NotificationsPage never learns who
 * is looking at it. Adding a role means adding an entry to ROLE_CONFIG and a
 * two-line route wrapper, not another copy of the page.
 */

export type NotificationRole = "admin" | "buyer" | "agent";

interface RoleConfig {
  /** Collection endpoint. Per-item paths are derived from it. */
  base: string;
  /** Where "view all" and the bell link to. */
  listPath: string;
}

const ROLE_CONFIG: Record<NotificationRole, RoleConfig> = {
  admin: {
    base: "/admin/notifications",
    listPath: "/admin-dashboard/notifications",
  },
  buyer: {
    base: "/buyer/notifications",
    listPath: "/buyer-dashboard/notifications",
  },
  agent: {
    base: "/agent/notifications",
    listPath: "/agent-dashboard/notifications",
  },
};

/*
 * The bell's dot is read from localStorage by DashboardLayout on every
 * navigation, so it stays in step with whatever this hook last saw.
 */
const HAS_UNREAD_KEY = "debridgers_has_unread";

function setHasUnreadFlag(unreadCount: number): void {
  try {
    localStorage.setItem(HAS_UNREAD_KEY, unreadCount > 0 ? "true" : "false");
  } catch {
    /* Private mode or blocked storage. The dot is a convenience, not state. */
  }
}

/* The API returns the row plus a derived status; created_at arrives as a string. */
interface ApiNotification {
  id: number;
  type: NotificationItem["type"];
  title: string;
  description: string;
  created_at: string;
  status: NotificationStatus;
}

export interface UseNotificationsServiceResult extends NotificationsViewProps {
  unreadCount: number;
  /** The most recent few, for the topbar dropdown. */
  recent: NotificationItem[];
  listPath: string;
  reload: () => void;
}

/*
 * One page per request. The backend caps `limit` at 50 and pages by offset;
 * this stays well under the cap so "Load more" has somewhere to go.
 */
const PAGE_SIZE = 20;

export function useNotificationsService({
  role,
}: {
  role: NotificationRole;
}): UseNotificationsServiceResult {
  const navigate = useNavigate();
  const { base, listPath } = ROLE_CONFIG[role];

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await apiFetch<ApiNotification[]>(
        `${base}?page=1&limit=${PAGE_SIZE}`,
      );
      setNotifications(rows);
      setPage(1);
      setHasMore(rows.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      /* An empty list would read as "nothing has happened", which is a
         different and misleading story. */
      setNotifications([]);
      setHasMore(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load notifications. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, [base]);

  const onLoadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const rows = await apiFetch<ApiNotification[]>(
        `${base}?page=${next}&limit=${PAGE_SIZE}`,
      );
      /* Dedupe on id: a row inserted between page reads shifts the offset and
         could otherwise repeat the last item of the previous page. */
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setPage(next);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      /* Keep what is already shown; the button stays for another try. */
    } finally {
      setLoadingMore(false);
    }
  }, [base, page, hasMore, loadingMore]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === "unread").length,
    [notifications],
  );

  useEffect(() => {
    if (!loading && !error) setHasUnreadFlag(unreadCount);
  }, [unreadCount, loading, error]);

  /*
   * Every mutation is optimistic with a rollback. The server's row is the
   * source of truth, so a failed PATCH must put the old status back rather
   * than leave the list showing a change that did not happen.
   */
  const mutate = useCallback(
    (
      apply: (rows: NotificationItem[]) => NotificationItem[],
      request: () => Promise<unknown>,
    ): void => {
      /* The snapshot is taken from the closure, not inside a state updater:
         React may invoke an updater twice, which would fire the PATCH twice. */
      const previous = notifications;
      setNotifications(apply(previous));
      request().catch(() => setNotifications(previous));
    },
    [notifications],
  );

  const onMarkAsRead = useCallback(
    (id: number): void => {
      mutate(
        (rows) =>
          rows.map((n) =>
            n.id === id && n.status === "unread" ? { ...n, status: "read" } : n,
          ),
        () => apiFetch(`${base}/${id}/read`, { method: "PATCH" }),
      );
    },
    [base, mutate],
  );

  const onMarkAsDone = useCallback(
    (id: number): void => {
      mutate(
        (rows) => rows.map((n) => (n.id === id ? { ...n, status: "done" } : n)),
        () => apiFetch(`${base}/${id}/done`, { method: "PATCH" }),
      );
    },
    [base, mutate],
  );

  const onMarkAllRead = useCallback((): void => {
    mutate(
      (rows) =>
        rows.map((n) => (n.status === "unread" ? { ...n, status: "read" } : n)),
      () => apiFetch(`${base}/mark-all/read`, { method: "PATCH" }),
    );
  }, [base, mutate]);

  const onItemClick = useCallback(
    (item: NotificationItem): void => {
      if (item.actionUrl) navigate(item.actionUrl);
    },
    [navigate],
  );

  const recent = useMemo<NotificationItem[]>(
    () => notifications.filter((n) => n.status !== "done").slice(0, 5),
    [notifications],
  );

  return {
    notifications,
    loading,
    error,
    onRetry: () => void load(),
    onMarkAsRead,
    onMarkAsDone,
    onMarkAllRead,
    onItemClick,
    unreadCount,
    recent,
    listPath,
    reload: () => void load(),
    hasMore,
    loadingMore,
    onLoadMore: () => void onLoadMore(),
  };
}
