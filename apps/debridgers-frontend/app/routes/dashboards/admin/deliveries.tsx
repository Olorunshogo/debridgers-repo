import { useState, useEffect, useMemo } from "react";
import { Truck, Calendar, MapPin, User } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import { useNavigate } from "react-router";
import {
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableDateCell,
  TableEmptyState,
  type TableColumn,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Delivery Verification | Debridgers Admin" },
    {
      name: "description",
      content:
        "Verify and confirm buyer order deliveries. Upload proof of delivery and manage delivery status.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface DeliveryOrder {
  id: number;
  /* Nullable until migration 0016 backfills the rows that predate 0011. */
  order_reference: string | null;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  created_at: string;
}

interface ApiDeliveriesResponse {
  orders: DeliveryOrder[];
  total: number;
}

export default function Deliveries() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* A failed load must not read as "no pending deliveries". */
  const [loadError, setLoadError] = useState<string | null>(null);

  function load(): void {
    setLoading(true);
    apiFetch<ApiDeliveriesResponse>("/admin/deliveries/pending")
      .then((data) => {
        setOrders(data.orders);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setOrders([]);
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not load deliveries. Check your connection and retry.",
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const stats = {
    pending: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.amount, 0),
  };

  const columns = useMemo<TableColumn<DeliveryOrder>[]>(
    () => [
      {
        id: "order_reference",
        header: "Order",
        priority: "primary",
        minWidth: "8rem",
        sortable: true,
        sortValue: (o) => o.order_reference ?? "",
        searchValue: (o) => o.order_reference ?? String(o.id),
        cell: (o) => (
          <span className="text-heading font-semibold">
            {o.order_reference ?? `#${o.id}`}
          </span>
        ),
      },
      {
        id: "buyer_name",
        header: "Buyer",
        priority: "primary",
        minWidth: "12rem",
        sortable: true,
        sortValue: (o) => o.buyer_name,
        searchValue: (o) => `${o.buyer_name} ${o.buyer_phone}`,
        cell: (o) => (
          <TablePrimaryCell
            title={o.buyer_name}
            subtitle={
              <span className="flex items-center gap-1">
                <User size={12} />
                {o.buyer_phone}
              </span>
            }
          />
        ),
      },
      {
        id: "delivery_address",
        header: "Delivery Address",
        priority: "secondary",
        minWidth: "16rem",
        searchValue: (o) => o.delivery_address,
        cell: (o) => (
          <span className="text-body flex items-start gap-1 text-xs">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="truncate">{o.delivery_address}</span>
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        priority: "trailing",
        sortable: true,
        sortValue: (o) => o.amount,
        cell: (o) => <TableAmountCell kobo={o.amount} />,
      },
      {
        id: "created_at",
        header: "Created",
        priority: "detail",
        sortable: true,
        sortValue: (o) => o.created_at,
        cell: (o) => <TableDateCell value={o.created_at} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Delivery Verification
            </h2>
            <p className="text-body text-sm">
              {loading ? "Loading..." : `${orders.length} pending deliveries`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-line flex items-start gap-3 rounded-2xl border bg-white p-4">
          <Truck size={20} className="text-status-pending-fg mt-1" />
          <div className="flex-1">
            <p className="text-body text-xs font-semibold tracking-wider uppercase">
              Pending Verification
            </p>
            <p className="font-syne text-heading text-lg font-bold">
              {stats.pending}
            </p>
          </div>
        </div>
        <div className="border-line flex items-start gap-3 rounded-2xl border bg-white p-4">
          <Calendar size={20} className="text-status-on-the-way-fg mt-1" />
          <div className="flex-1">
            <p className="text-body text-xs font-semibold tracking-wider uppercase">
              Total Amount
            </p>
            <p className="font-syne text-heading text-lg font-bold">
              ₦{(stats.totalAmount / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        rows={orders}
        columns={columns}
        caption="Pending deliveries"
        showSearch
        searchPlaceholder="Search by order, buyer or address"
        loading={loading}
        error={loadError}
        onRetry={load}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={(order) =>
          navigate(`/admin-dashboard/deliveries/${order.id}/verify`)
        }
        emptyState={
          <TableEmptyState
            icon={Truck}
            title="No pending deliveries"
            description="Deliveries awaiting verification will appear here."
          />
        }
      />
    </div>
  );
}
