/*
 * The shared notification contract.
 *
 * One shape for every dashboard. The backend stores `read` and `done` as two
 * booleans and collapses them into `status` on the way out, so the UI only
 * ever reasons about one field.
 */

export type NotificationStatus = "unread" | "read" | "done";

/*
 * Mirrors NOTIFICATION_TYPES in the backend's notifications schema. Kept as a
 * union rather than an enum so an unrecognised value from an older or newer
 * server is a type error here but degrades to the neutral icon at runtime.
 */
export type NotificationType =
  | "order"
  | "payment"
  | "wallet"
  | "delivery"
  | "agent"
  | "kyc"
  | "withdrawal"
  | "stock"
  | "general";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  created_at: string;
  status: NotificationStatus;
  /** Where clicking the notification should take the viewer, if anywhere. */
  actionUrl?: string;
}

/*
 * What a role's service hook hands the page. The page itself is presentational:
 * it never fetches, so the same component serves admin, buyer and anyone added
 * later.
 */
export interface NotificationsViewProps {
  notifications: NotificationItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAsDone: (id: number) => void;
  onMarkAllRead: () => void;
  onItemClick?: (item: NotificationItem) => void;
}
