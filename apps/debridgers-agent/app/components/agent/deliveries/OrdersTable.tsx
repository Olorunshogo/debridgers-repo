import { useMemo } from "react";
import { Truck, MapPin, Phone, Star } from "lucide-react";
import {
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableAmountCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  useDialog,
  type RowAction,
  type TableColumn,
} from "@debridgers/ui-web";
import type { PendingRating } from "@debridgers/ui-web";
import { STATUS_PRESENTATION, buyerName, type AgentOrder } from "./types";

export interface OrdersTableProps {
  rows: AgentOrder[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  movingOrderId: number | null;
  onMarkOutForDelivery: (id: number) => void | Promise<void>;
  pendingRatings: PendingRating[];
  onReloadRatings: () => void;
}

export function OrdersTable({
  rows,
  loading,
  error,
  onRetry,
  movingOrderId,
  onMarkOutForDelivery,
  pendingRatings,
  onReloadRatings,
}: OrdersTableProps) {
  const { triggerDialog } = useDialog();

  const ratingFor = (orderId: number): PendingRating | undefined =>
    pendingRatings.find((r) => r.orderId === orderId);

  const columns = useMemo<TableColumn<AgentOrder>[]>(
    () => [
      {
        id: "buyer",
        header: "Buyer",
        priority: "primary",
        minWidth: "14rem",
        searchValue: (row) => `${buyerName(row)} ${row.buyer_phone ?? ""}`,
        cell: (row) => (
          <TablePrimaryCell
            title={`Order #${row.id}`}
            subtitle={buyerName(row)}
          />
        ),
      },
      {
        id: "delivery_address",
        header: "Delivery address",
        priority: "secondary",
        minWidth: "16rem",
        cell: (row) => (
          <span className="text-body flex items-center gap-1.5 truncate text-xs">
            <MapPin size={12} className="shrink-0" /> {row.delivery_address}
          </span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        priority: "detail",
        cell: (row) =>
          row.buyer_phone ? (
            <span className="text-body flex items-center gap-1.5 text-xs">
              <Phone size={12} /> {row.buyer_phone}
            </span>
          ) : (
            <TableTextCell value={null} />
          ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        priority: "trailing",
        sortable: true,
        sortValue: (row) => row.total_amount,
        cell: (row) => <TableAmountCell kobo={row.total_amount} />,
      },
      {
        id: "status",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <TableStatusBadge
            label={STATUS_PRESENTATION[row.status].label}
            tone={STATUS_PRESENTATION[row.status].tone}
          />
        ),
      },
      {
        id: "created_at",
        header: "Ordered",
        priority: "detail",
        sortable: true,
        sortValue: (row) => row.created_at,
        cell: (row) => <TableDateCell value={row.created_at} withTime />,
      },
    ],
    [],
  );

  const actions = useMemo<RowAction<AgentOrder>[]>(
    () => [
      {
        id: "out-for-delivery",
        label: "Out for delivery",
        icon: Truck,
        tone: "primary",
        hidden: (row) => row.status !== "confirmed",
        isBusy: (row) => movingOrderId === row.id,
        onSelect: (row) => onMarkOutForDelivery(row.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (row) => ({
            title: `Move order #${row.id} onto the road?`,
            description: `This marks the order out for delivery to ${buyerName(row)}.`,
            confirmLabel: "Out for delivery",
            tone: "primary",
          }),
        },
      },
      {
        id: "rate-order",
        label: "Rate order",
        icon: Star,
        tone: "primary",
        hidden: (row) => row.status !== "delivered" || !ratingFor(row.id),
        onSelect: (row) => {
          const rating = ratingFor(row.id);
          if (!rating) return;
          triggerDialog("RATE_ORDER", {
            contextKey: rating.contextKey,
            orderId: row.id,
            subjectLabel: rating.description,
            onRated: onReloadRatings,
          });
        },
      },
    ],
    [
      movingOrderId,
      onMarkOutForDelivery,
      pendingRatings,
      onReloadRatings,
      triggerDialog,
    ],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      actions={actions}
      caption="Deliveries"
      showSearch
      searchPlaceholder="Search by buyer name or phone"
      loading={loading}
      error={error}
      onRetry={onRetry}
      initialSort={{ key: "created_at", direction: "desc" }}
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        <TableEmptyState
          icon={Truck}
          title="No referred orders yet"
          description="Orders from buyers you referred will show here."
        />
      }
    />
  );
}

OrdersTable.displayName = "OrdersTable";
