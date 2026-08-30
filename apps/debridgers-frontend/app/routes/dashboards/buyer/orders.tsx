import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  formatFromKobo,
  DashSubmitButton,
  DashTextareaInput,
  DashSelectButton,
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableAmountCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type StatusTone,
  type TableColumn,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "My Orders | Debridgers" },
    {
      name: "description",
      content:
        "Track your current and past Debridgers orders — view status, items and delivery details.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type OrderStatus =
  | "active"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "delivered";
type Tab = "all" | OrderStatus;

/*
 * Raw values, not display strings.
 *
 * date and amount used to be pre-formatted here, which reads fine until the
 * table sorts them: "Apr" sorts before "Jan" and "₦9,000" before "₦10,000",
 * because both are string comparisons. The cells format at render instead.
 */
interface Order {
  id: string;
  orderId: string;
  items: string;
  quantity: number;
  createdAt: string;
  amountKobo: number;
  status: OrderStatus;
}

interface ApiOrder {
  id: number;
  order_reference: string;
  status: string;
  payment_status: string;
  total_amount: number;
  quantity: number;
  delivery_address: string;
  created_at: string;
}

function mapApiOrder(o: ApiOrder): Order {
  const dbToUi = (orderStatus: string, paymentStatus: string): OrderStatus => {
    // If payment not made yet, show as pending
    if (paymentStatus === "unpaid") return "pending";

    // If paid but not yet in transit
    if (paymentStatus === "paid" && orderStatus === "confirmed")
      return "confirmed";

    // If out for delivery or delivered
    if (orderStatus === "out_for_delivery") return "active";
    if (orderStatus === "delivered") return "delivered";
    if (orderStatus === "cancelled") return "cancelled";

    return "pending";
  };
  return {
    id: String(o.id),
    orderId: o.order_reference,
    items: `${o.quantity} pack${o.quantity !== 1 ? "s" : ""}`,
    quantity: o.quantity,
    createdAt: o.created_at,
    amountKobo: o.total_amount,
    status: dbToUi(o.status, o.payment_status),
  };
}

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

/*
 * Tone plus label, rather than raw class pairs. TableStatusBadge already owns
 * the token pairing, and "confirmed" was reaching for bg-green-100 /
 * text-green-700 - palette literals that match nothing else in the system.
 */
const STATUS_PRESENTATION: Record<
  OrderStatus,
  { tone: StatusTone; label: string }
> = {
  active: { tone: "info", label: "On the way" },
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "success", label: "Paid" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

/* Trackable states. Named once because the row action and the detail panel
   both ask the same question. */
function isTrackable(status: OrderStatus): boolean {
  return status === "active" || status === "delivered";
}

/*
 * Module scope: an inline array rebuilds every cell on every keystroke in the
 * table's search box.
 */
const COLUMNS: readonly TableColumn<Order>[] = [
  {
    id: "orderId",
    header: "Order ID",
    priority: "primary",
    minWidth: "12rem",
    sortable: true,
    sortValue: (o) => o.orderId,
    searchValue: (o) => `${o.orderId} ${o.items}`,
    cell: (o) => (
      <TablePrimaryCell
        title={<span className="font-mono text-xs">{o.orderId}</span>}
        subtitle={o.items}
      />
    ),
  },
  {
    id: "items",
    header: "Items",
    priority: "detail",
    minWidth: "7rem",
    sortable: true,
    sortValue: (o) => o.quantity,
    cell: (o) => <TableTextCell value={o.items} />,
  },
  {
    id: "date",
    header: "Date",
    priority: "secondary",
    minWidth: "9rem",
    sortable: true,
    sortValue: (o) => o.createdAt,
    cell: (o) => <TableDateCell value={o.createdAt} />,
  },
  {
    id: "amount",
    header: "Amount",
    priority: "secondary",
    align: "right",
    minWidth: "8rem",
    sortable: true,
    sortValue: (o) => o.amountKobo,
    cell: (o) => <TableAmountCell kobo={o.amountKobo} />,
  },
  {
    id: "status",
    header: "Status",
    priority: "trailing",
    minWidth: "9rem",
    sortable: true,
    sortValue: (o) => o.status,
    cell: (o) => (
      <TableStatusBadge
        label={STATUS_PRESENTATION[o.status].label}
        tone={STATUS_PRESENTATION[o.status].tone}
      />
    ),
  },
];

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function closeDetail(): void {
    setSelected(null);
    setConfirmingCancel(false);
    setCancelReason("");
    setCancelError(null);
  }

  /*
   * The backend only lets an order be cancelled while it is still unpaid, which
   * maps to the Pending status here. Anything already paid has to go through a
   * refund request instead, so the button is not offered for those.
   */
  async function handleCancel(): Promise<void> {
    if (!selected || cancelReason.trim().length < 5) return;

    setCancelling(true);
    setCancelError(null);

    try {
      await apiFetch(`/buyer/orders/${selected.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === selected.id ? { ...o, status: "cancelled" } : o,
        ),
      );
      closeDetail();
    } catch (err) {
      setCancelError(
        err instanceof Error
          ? err.message
          : "Could not cancel this order. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  /*
   * A failed load used to console.error and leave the list empty, which the
   * table then reported as "no orders" - a very different thing to tell a
   * buyer than "we could not reach the server".
   */
  const load = useCallback((): void => {
    setLoading(true);
    apiFetch<ApiOrder[]>("/buyer/orders")
      .then((rows) => {
        setOrders(rows.map(mapApiOrder));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setOrders([]);
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not load your orders. Check your connection and retry.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? orders
        : orders.filter((o) => o.status === activeTab),
    [orders, activeTab],
  );

  const emptyState = useMemo(
    () => (
      <TableEmptyState
        icon={Package}
        title="No orders yet"
        description="Orders you place will appear here."
      />
    ),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        rows={filtered}
        columns={COLUMNS}
        caption="My orders"
        showSearch
        searchPlaceholder="Search by order ID or items"
        loading={loading}
        error={loadError}
        onRetry={load}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={(order) => setSelected(order)}
        /* The status filter lives on the page, so the engine is told when it
           changes and the viewer does not stay on a page that no longer
           exists. */
        resetKey={activeTab}
        toolbar={
          <DashSelectButton
            label="Status"
            showInlineLabel
            size="sm"
            className="sm:w-52"
            value={activeTab}
            options={tabs.map((tab) => ({
              value: tab.key,
              label: tab.label,
            }))}
            onChange={(next) => setActiveTab(next as Tab)}
          />
        }
        emptyState={emptyState}
      />

      {/* Order detail popover */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 cursor-pointer bg-black/30"
              onClick={closeDetail}
            />
            <motion.div
              key="popover"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-175 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-heading font-mono text-sm font-semibold">
                    {selected.orderId}
                  </p>
                  <p className="text-body text-sm">{selected.items}</p>
                  <p className="text-body text-sm">
                    {new Date(selected.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="font-syne text-heading mt-2 text-2xl font-bold">
                    {formatFromKobo(selected.amountKobo)}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  aria-label="Close order details"
                  className="text-icon-secondary cursor-pointer rounded-full p-1.5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <TableStatusBadge
                  label={STATUS_PRESENTATION[selected.status].label}
                  tone={STATUS_PRESENTATION[selected.status].tone}
                />
                {isTrackable(selected.status) && (
                  <DashSubmitButton
                    variant="primary"
                    type="button"
                    className="px-3 py-1 text-xs font-medium"
                  >
                    Track
                  </DashSubmitButton>
                )}
              </div>

              {selected.status === "pending" && (
                <div className="border-line mt-5 flex flex-col gap-3 border-t pt-5">
                  {confirmingCancel ? (
                    <>
                      <DashTextareaInput
                        label="Why are you cancelling?"
                        name="cancelReason"
                        rows={3}
                        placeholder="Let us know so we can improve."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        error={cancelError ?? undefined}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <DashSubmitButton
                          variant="secondary"
                          type="button"
                          disabled={cancelling}
                          onClick={() => setConfirmingCancel(false)}
                          className="text-xs"
                        >
                          Keep order
                        </DashSubmitButton>
                        <DashSubmitButton
                          variant="primary"
                          type="button"
                          loading={cancelling}
                          loadingText="Cancelling..."
                          disabled={cancelReason.trim().length < 5}
                          onClick={handleCancel}
                          className="px-4 py-2 text-xs"
                        >
                          Confirm cancellation
                        </DashSubmitButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <DashSubmitButton
                        variant="secondary"
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        className="w-fit text-xs"
                      >
                        Cancel order
                      </DashSubmitButton>
                      <p className="text-body text-xs">
                        Only unpaid orders can be cancelled here. Once an order
                        is paid, contact support to request a refund.
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
