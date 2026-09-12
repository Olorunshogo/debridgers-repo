import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Truck } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  useAsyncResource,
  useDialog,
  usePendingRatings,
} from "@debridgers/ui-web";
import { OrdersTable, type AgentOrder } from "@/components/agent/deliveries";

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

export default function AgentDeliveriesPage() {
  const { triggerDialog } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    pending: pendingRatings,
    loading: pendingLoading,
    reload: reloadPendingRatings,
  } = usePendingRatings();
  const ratingPromptOpened = useRef(false);
  const { data, error, loading, refetch } = useAsyncResource<AgentOrder[]>(
    (signal: AbortSignal): Promise<AgentOrder[]> =>
      apiFetch<AgentOrder[]>("/agent/orders", { signal }),
    [],
  );

  const [movingId, setMovingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const orders: AgentOrder[] = data ?? [];

  /*
   * After delivery, open the first pending rating sheet once.
   * ?rate=1 comes from the notification deep-link.
   */
  useEffect(() => {
    if (
      pendingLoading ||
      ratingPromptOpened.current ||
      pendingRatings.length === 0
    ) {
      return;
    }

    ratingPromptOpened.current = true;
    const first = pendingRatings[0];
    triggerDialog("RATE_ORDER", {
      contextKey: first.contextKey,
      orderId: first.orderId,
      subjectLabel: first.description,
      onRated: reloadPendingRatings,
    });

    if (searchParams.get("rate") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("rate");
      setSearchParams(next, { replace: true });
    }
  }, [
    pendingLoading,
    pendingRatings,
    reloadPendingRatings,
    searchParams,
    setSearchParams,
    triggerDialog,
  ]);

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

      <OrdersTable
        rows={orders}
        loading={loading}
        error={error?.message ?? null}
        onRetry={refetch}
        movingOrderId={movingId}
        onMarkOutForDelivery={markOutForDelivery}
        pendingRatings={pendingRatings}
        onReloadRatings={reloadPendingRatings}
      />
    </div>
  );
}
