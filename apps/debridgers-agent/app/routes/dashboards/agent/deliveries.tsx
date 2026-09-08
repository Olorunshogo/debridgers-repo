import { useState } from "react";
import { motion } from "framer-motion";
import { Truck, MapPin, Phone } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  useAsyncResource,
  AsyncBoundary,
  TableStatusBadge,
  formatFromKobo,
  useDialog,
  usePendingRatings,
  type StatusTone,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Deliveries | Debridgers",
    description:
      "Track orders from buyers you referred and mark them out for delivery.",
    path: "/deliveries",
    noIndex: true,
  });
}

// === Types
type AgentOrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface AgentOrder {
  id: number;
  status: AgentOrderStatus;
  payment_status: string;
  quantity: number;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone: string | null;
}

// === Status presentation
const STATUS_TONE: Record<AgentOrderStatus, StatusTone> = {
  pending: "warning",
  confirmed: "info",
  out_for_delivery: "active",
  delivered: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<AgentOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// === Page
export default function AgentDeliveriesPage() {
  const { triggerDialog } = useDialog();
  const { pending: pendingRatings, reload: reloadPendingRatings } =
    usePendingRatings();
  const { data, error, loading, refetch, refetching } = useAsyncResource<
    AgentOrder[]
  >(
    (signal: AbortSignal): Promise<AgentOrder[]> =>
      apiFetch<AgentOrder[]>("/agent/orders", { signal }),
    [],
  );

  const [movingId, setMovingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const orders: AgentOrder[] = data ?? [];

  async function markOutForDelivery(id: number): Promise<void> {
    setMovingId(id);
    setActionError(null);
    try {
      await apiFetch(`/agent/orders/${id}/out-for-delivery`, {
        method: "PATCH",
      });
      refetch();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not update this order. Try again.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="py-section-px flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Truck size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            Deliveries
          </h2>
          <p className="text-body text-sm">
            Orders from buyers you referred. Move a confirmed order onto the
            road.
          </p>
        </div>
      </div>

      {actionError && (
        <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
          {actionError}
        </p>
      )}

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={refetch}
        isEmpty={orders.length === 0}
        skeleton={
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-line h-24 animate-pulse rounded-2xl" />
            ))}
          </div>
        }
        empty={
          <div className="border-line flex flex-col items-center gap-2 rounded-2xl border bg-white py-16 text-center">
            <Truck size={28} className="text-icon-secondary" />
            <p className="font-syne text-heading font-semibold">
              No referred orders yet
            </p>
            <p className="text-body text-sm">
              Orders from buyers you referred will show here.
            </p>
          </div>
        }
      >
        <div
          className={`flex flex-col gap-3 ${refetching ? "opacity-60" : ""}`}
        >
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-heading text-sm font-semibold">
                    Order #{order.id}
                  </p>
                  <TableStatusBadge
                    label={STATUS_LABEL[order.status]}
                    tone={STATUS_TONE[order.status]}
                  />
                </div>
                <p className="text-body text-xs">
                  {order.buyer_first_name} {order.buyer_last_name}
                  {" · "}
                  {order.quantity} item{order.quantity === 1 ? "" : "s"}
                  {" · "}
                  {formatFromKobo(order.total_amount)}
                </p>
                <p className="text-body flex items-center gap-1.5 text-xs">
                  <MapPin size={12} /> {order.delivery_address}
                </p>
                {order.buyer_phone && (
                  <p className="text-body flex items-center gap-1.5 text-xs">
                    <Phone size={12} /> {order.buyer_phone}
                  </p>
                )}
              </div>

              {order.status === "confirmed" && (
                <button
                  type="button"
                  disabled={movingId === order.id}
                  onClick={() => void markOutForDelivery(order.id)}
                  className="border-primary text-primary w-fit shrink-0 cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {movingId === order.id ? "Updating..." : "Out for delivery"}
                </button>
              )}

              {order.status === "delivered" &&
                pendingRatings
                  .filter((r) => r.orderId === order.id)
                  .map((r) => (
                    <button
                      key={r.contextKey}
                      type="button"
                      onClick={() =>
                        triggerDialog("RATE_ORDER", {
                          contextKey: r.contextKey,
                          orderId: order.id,
                          subjectLabel: r.description,
                          onRated: reloadPendingRatings,
                        })
                      }
                      className="border-primary text-primary w-fit shrink-0 cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                    >
                      {r.title}
                    </button>
                  ))}
            </motion.div>
          ))}
        </div>
      </AsyncBoundary>
    </div>
  );
}
