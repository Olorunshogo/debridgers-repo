/*
 * Shared by the admin and agent order-status endpoints so both enforce the same
 * lifecycle and send the buyer the same wording.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// === Transitions

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "delivered", "cancelled"], // TODO: Remove "delivered" after testing
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/* Agents move a parcel onto the road; only admin closes it out as delivered. */
export const AGENT_ALLOWED_STATUSES: OrderStatus[] = ["out_for_delivery"];

// === Buyer-facing copy

export const ORDER_STATUS_NOTIFICATION: Record<
  OrderStatus,
  { title: (orderId: number) => string; body: string }
> = {
  pending: {
    title: (id) => `Order #${id} received`,
    body: "We have received your order and are getting it ready.",
  },
  confirmed: {
    title: (id) => `Order #${id} confirmed`,
    body: "Your order has been confirmed and will be processed soon.",
  },
  out_for_delivery: {
    title: (id) => `Order #${id} is on the way`,
    body: "Your order has left our hub and is on its way to you.",
  },
  delivered: {
    title: (id) => `Order #${id} delivered`,
    body: "Your order has been delivered. Thank you for shopping with Debridgers.",
  },
  cancelled: {
    title: (id) => `Order #${id} cancelled`,
    body: "Your order has been cancelled. Any payment made will be refunded.",
  },
};
