/*
 * Every status enum that exists as a Postgres enum on the backend AND is
 * re-typed by hand in a frontend page lives here instead, exactly the way
 * @debridgers/pricing is the one place money numbers live.
 *
 * The backend imports these arrays into its Drizzle pgEnum() calls; a frontend
 * page imports the same array to build its status union type and its filter
 * list. Editing a value here and rebuilding both sides is the only way either
 * side's list changes - there is no second copy left to fall out of sync,
 * which is what let WithdrawalStatus and OrderStatus in the admin app go
 * stale the moment withdrawal_status/order_status gained new values.
 *
 * What each array does NOT own: transition rules (which status can move to
 * which), buyer-facing notification copy, and per-status UI presentation
 * (badge tone, icon, label). Those differ by caller and stay where they are -
 * order-status.ts on the backend, the STATUS_PRESENTATION/STATUS_BADGE maps
 * on the frontend - keyed off the types exported here so a missing case is a
 * compile error instead of a runtime crash.
 */

// === Orders

export const ORDER_STATUSES = [
  "awaiting_quote",
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "awaiting",
  "paid",
  "failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// === Agents

export const AGENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const KYC_STATUSES = [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
] as const;

export type KycStatus = (typeof KYC_STATUSES)[number];

// === Money movement

export const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "processing",
  "rejected",
  "failed",
  "paid",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const COMMISSION_STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "reversed",
] as const;

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

// === Stock

export const STOCK_REQUEST_STATUSES = ["pending", "fulfilled"] as const;

export type StockRequestStatus = (typeof STOCK_REQUEST_STATUSES)[number];
