import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, Clock, Truck, XCircle } from "lucide-react";
import { apiFetchPaged, apiMutate, ApiError } from "@debridgers/api-client";
import {
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type RowAction,
  type StatusTone,
  type TableColumn,
  type TableStateSnapshot,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Manage Deliveries | Buyer Admin" },
    {
      name: "description",
      content: "Track and confirm order deliveries. Mark orders as delivered.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type OrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/* Mirrors the columns /admin/orders selects. The previous shape claimed a
   `buyer_name` the endpoint has never returned. */
interface Order {
  id: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  delivery_address: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
}

interface StatusPresentation {
  tone: StatusTone;
  icon: typeof Check;
  label: string;
}

const STATUS_PRESENTATION: Record<OrderStatus, StatusPresentation> = {
  pending: { tone: "warning", icon: Clock, label: "Pending" },
  confirmed: { tone: "info", icon: Clock, label: "Confirmed" },
  out_for_delivery: { tone: "info", icon: Truck, label: "Out for delivery" },
  delivered: { tone: "success", icon: Check, label: "Delivered" },
  cancelled: { tone: "danger", icon: XCircle, label: "Cancelled" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
];

function buyerName(order: Order): string {
  const name = [order.buyer_first_name, order.buyer_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || order.buyer_email || `Buyer #${order.id}`;
}

function canMarkDelivered(order: Order): boolean {
  return order.status === "out_for_delivery" || order.status === "confirmed";
}

export default function BuyerAdminDeliveries() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageCount, setPageCount] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [onTheRoad, setOnTheRoad] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  /* A failed request used to render as "No orders found". It is not the same
     thing, and an admin acting on that would be acting on a lie. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  /* The engine's last emitted state, so an action can reload the same page. */
  const [snapshot, setSnapshot] = useState<TableStateSnapshot | null>(null);

  /*
   * Server mode: the endpoint paginates, sorts and searches, and the engine
   * renders the page it is handed. Sort keys below are the endpoint's own
   * allowlist, so an unknown one is a 400 rather than a silent full-table sort.
   */
  const loadOrders = useCallback(
    async (state: TableStateSnapshot, status: string): Promise<void> => {
      setLoading(true);
      try {
        const { data, meta } = await apiFetchPaged<Order>("/admin/orders", {
          page: state.page,
          limit: state.pageSize,
          search: state.search,
          sort: state.sort?.key,
          order: state.sort?.direction,
          status: status || undefined,
        });
        setOrders(data);
        setPageCount(meta.pages);
        setTotal(meta.total);
        setLoadError(null);
      } catch (error) {
        setOrders([]);
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Could not load orders. Check your connection and retry.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* Counted server-side rather than from the visible page, which would only
     ever count ten rows. */
  const loadOnTheRoadCount = useCallback(async (): Promise<void> => {
    try {
      const { meta } = await apiFetchPaged<Order>("/admin/orders", {
        status: "out_for_delivery",
        limit: 1,
      });
      setOnTheRoad(meta.total);
    } catch {
      /* A banner that cannot be counted simply does not show. */
      setOnTheRoad(0);
    }
  }, []);

  useEffect(() => {
    void loadOnTheRoadCount();
  }, [loadOnTheRoadCount]);

  const handleStateChange = useCallback(
    (state: TableStateSnapshot): void => {
      setSnapshot(state);
      void loadOrders(state, statusFilter);
    },
    [loadOrders, statusFilter],
  );

  const handleMarkDelivered = useCallback(
    async (orderId: number): Promise<void> => {
      setActioningId(orderId);
      try {
        await apiMutate(`/admin/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "delivered" }),
        });
        if (snapshot) await loadOrders(snapshot, statusFilter);
        await loadOnTheRoadCount();
      } catch (error) {
        /* Throws so the confirm dialog reports it and stays open, instead of
           closing over a delivery that was never marked. */
        throw new Error(
          error instanceof ApiError
            ? error.message
            : "Could not mark that order as delivered. Please try again.",
        );
      } finally {
        setActioningId(null);
      }
    },
    [snapshot, statusFilter, loadOrders, loadOnTheRoadCount],
  );

  const columns = useMemo<TableColumn<Order>[]>(
    () => [
      {
        id: "id",
        header: "Order ID",
        priority: "primary",
        sortable: true,
        cell: (order) => (
          <span className="text-heading font-mono text-xs font-semibold">
            #{order.id}
          </span>
        ),
      },
      {
        id: "buyer_name",
        header: "Buyer",
        priority: "primary",
        minWidth: "14rem",
        sortable: true,
        cell: (order) => (
          <TablePrimaryCell
            title={buyerName(order)}
            subtitle={order.buyer_email}
          />
        ),
      },
      {
        id: "delivery_address",
        header: "Delivery Address",
        priority: "secondary",
        minWidth: "16rem",
        cell: (order) => (
          <span className="text-body truncate text-xs">
            {order.delivery_address ?? "-"}
          </span>
        ),
      },
      {
        id: "total_amount",
        header: "Amount",
        align: "right",
        priority: "trailing",
        sortable: true,
        cell: (order) => <TableAmountCell kobo={order.total_amount} />,
      },
      {
        id: "status",
        header: "Status",
        priority: "trailing",
        sortable: true,
        cell: (order) => {
          const presentation = STATUS_PRESENTATION[order.status];
          const Icon = presentation.icon;
          return (
            <TableStatusBadge
              label={presentation.label}
              tone={presentation.tone}
              icon={<Icon size={13} />}
            />
          );
        },
      },
      {
        id: "created_at",
        header: "Ordered",
        priority: "detail",
        sortable: true,
        cell: (order) => <TableDateCell value={order.created_at} withTime />,
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Order>[]>(
    () => [
      {
        id: "mark-delivered",
        label: "Mark delivered",
        icon: Check,
        tone: "primary",
        hidden: (order) => !canMarkDelivered(order),
        isBusy: (order) => actioningId === order.id,
        onSelect: (order) => handleMarkDelivered(order.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (order) => ({
            title: `Mark order #${order.id} as delivered?`,
            description: `This confirms ${buyerName(order)} has received the order.`,
            confirmLabel: "Mark delivered",
            tone: "primary",
          }),
        },
      },
    ],
    [actioningId, handleMarkDelivered],
  );

  return (
    <div className="flex flex-col gap-6">
      {onTheRoad > 0 && (
        <div className="bg-status-pending rounded-2xl p-4">
          <p className="text-status-pending-fg text-sm font-medium">
            {onTheRoad} order{onTheRoad === 1 ? "" : "s"} out for delivery and
            awaiting confirmation
          </p>
        </div>
      )}

      <DataTable
        rows={orders}
        columns={columns}
        actions={rowActions}
        dataMode="server"
        total={total}
        pageCount={pageCount}
        onStateChange={handleStateChange}
        resetKey={statusFilter}
        caption="Orders"
        showSearch
        searchPlaceholder="Search by buyer name or email"
        loading={loading}
        error={loadError}
        onRetry={() => snapshot && void loadOrders(snapshot, statusFilter)}
        initialSort={{ key: "created_at", direction: "desc" }}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        toolbar={FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              statusFilter === filter.value
                ? "border-primary bg-primary text-white"
                : "border-line text-heading hover:border-primary bg-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
        emptyState={
          <TableEmptyState
            icon={Truck}
            title="No orders here"
            description="Orders matching this view will appear here."
          />
        }
      />
    </div>
  );
}
