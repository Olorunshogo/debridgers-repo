import type { OrderStatus, PaymentStatus } from "@debridgers/domain-status";
import type { StatusTone } from "@debridgers/ui-web";

export interface AgentOrder {
  id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  quantity: number;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone: string | null;
}

export const STATUS_PRESENTATION: Record<
  OrderStatus,
  { tone: StatusTone; label: string }
> = {
  awaiting_quote: { tone: "warning", label: "Awaiting quote" },
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "info", label: "Confirmed" },
  out_for_delivery: { tone: "active", label: "Out for delivery" },
  delivery_failed: { tone: "danger", label: "Delivery failed" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

export function buyerName(order: AgentOrder): string {
  return `${order.buyer_first_name} ${order.buyer_last_name}`.trim();
}
