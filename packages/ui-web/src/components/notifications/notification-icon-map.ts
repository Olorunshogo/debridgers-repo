import {
  Package,
  CreditCard,
  Wallet,
  Truck,
  UserCheck,
  ShieldCheck,
  Banknote,
  Boxes,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "./types";

/*
 * Icon and colour per notification type.
 *
 * Colours are design tokens, never raw palette classes: the status tokens are
 * the same ones the tables and badges use, so a "delivery" notification reads
 * the same green as a delivered row.
 */

export const NOTIFICATION_ICON_MAP: Record<NotificationType, LucideIcon> = {
  order: Package,
  payment: CreditCard,
  wallet: Wallet,
  delivery: Truck,
  agent: UserCheck,
  kyc: ShieldCheck,
  withdrawal: Banknote,
  stock: Boxes,
  general: Bell,
};

export const NOTIFICATION_ICON_CLASS: Record<NotificationType, string> = {
  order: "bg-status-on-the-way text-status-on-the-way-fg",
  payment: "bg-status-delivered text-status-delivered-fg",
  wallet: "bg-accent-soft text-accent-soft-fg",
  delivery: "bg-status-on-the-way text-status-on-the-way-fg",
  agent: "bg-status-active text-status-active-fg",
  kyc: "bg-status-pending text-status-pending-fg",
  withdrawal: "bg-status-cancelled text-status-cancelled-fg",
  stock: "bg-accent-soft text-accent-soft-fg",
  general: "bg-light-bg text-body",
};

/* A type the client does not know about still renders, as a neutral bell. */
export function iconFor(type: NotificationType): LucideIcon {
  return NOTIFICATION_ICON_MAP[type] ?? Bell;
}

export function iconClassFor(type: NotificationType): string {
  return NOTIFICATION_ICON_CLASS[type] ?? NOTIFICATION_ICON_CLASS.general;
}
