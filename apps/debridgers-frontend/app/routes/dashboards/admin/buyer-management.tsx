import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, Wallet, Package, AlertCircle } from "lucide-react";
import {
  DataTable,
  DashSelectButton,
  TablePrimaryCell,
  TableTextCell,
  TableAmountCell,
  TableStatusBadge,
  TableEmptyState,
  type TableColumn,
  type StatusTone,
} from "@debridgers/ui-web";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Buyer Management | Debridgers Admin" },
    {
      name: "description",
      content:
        "Manage Debridgers buyers. View profiles, deposits, orders, and suspend accounts.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type BuyerStatus = "active" | "suspended";

interface BuyerListItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: BuyerStatus;
  total_deposited: number;
  joined_at: string;
}

interface ApiBuyerListResponse {
  buyers: {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: "active" | "suspended";
    total_deposited: number;
    joined_at: string;
  }[];
  total: number;
}

const STATUS_BADGE: Record<BuyerStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "active", label: "Active" },
  suspended: { tone: "danger", label: "Suspended" },
};

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

/* Module scope: an inline array re-derives every row on every keystroke. */
const COLUMNS: readonly TableColumn<BuyerListItem>[] = [
  {
    id: "name",
    header: "Buyer",
    priority: "primary",
    minWidth: "14rem",
    sortable: true,
    sortValue: (b) => b.name,
    searchValue: (b) => `${b.name} ${b.phone}`,
    cell: (b) => <TablePrimaryCell title={b.name} subtitle={`ID: ${b.id}`} />,
  },
  {
    id: "email",
    header: "Email",
    priority: "secondary",
    minWidth: "16rem",
    sortable: true,
    sortValue: (b) => b.email,
    searchValue: (b) => b.email,
    cell: (b) => <TableTextCell value={b.email} />,
  },
  {
    id: "total_deposited",
    header: "Deposited",
    priority: "trailing",
    align: "right",
    minWidth: "8rem",
    sortable: true,
    sortValue: (b) => b.total_deposited,
    cell: (b) => <TableAmountCell kobo={b.total_deposited} />,
  },
  {
    id: "joined_at",
    header: "Joined",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (b) => b.joined_at,
    cell: (b) => (
      <TableTextCell
        value={new Date(b.joined_at).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      />
    ),
  },
  {
    id: "status",
    header: "Status",
    priority: "trailing",
    align: "right",
    sortable: true,
    sortValue: (b) => STATUS_BADGE[b.status].label,
    cell: (b) => (
      <TableStatusBadge
        label={STATUS_BADGE[b.status].label}
        tone={STATUS_BADGE[b.status].tone}
      />
    ),
  },
];

export default function BuyerManagement() {
  const [buyers, setBuyers] = useState<BuyerListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* A failed load must not render as "no buyers", which is a different story. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await apiFetch<ApiBuyerListResponse>("/admin/buyers");
      setBuyers(data.buyers);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load buyers. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Only the status filter is applied here; search, sort and paging are the
     engine's job now. */
  const visible = useMemo<BuyerListItem[]>(
    () =>
      statusFilter === "all"
        ? buyers
        : buyers.filter((b) => b.status === statusFilter),
    [buyers, statusFilter],
  );

  const stats = useMemo(
    () => ({
      total: buyers.length,
      active: buyers.filter((b) => b.status === "active").length,
      suspended: buyers.filter((b) => b.status === "suspended").length,
      totalDeposits: buyers.reduce((sum, b) => sum + b.total_deposited, 0),
    }),
    [buyers],
  );

  const statCards = useMemo(
    () => [
      {
        label: "Total Buyers",
        value: stats.total,
        icon: Users,
        color: "text-status-on-the-way-fg",
      },
      {
        label: "Active",
        value: stats.active,
        icon: Package,
        color: "text-status-delivered-fg",
      },
      {
        label: "Suspended",
        value: stats.suspended,
        icon: AlertCircle,
        color: "text-status-cancelled-fg",
      },
      {
        label: "Total Deposits",
        value: `₦${(stats.totalDeposits / 100).toLocaleString()}`,
        icon: Wallet,
        color: "text-status-pending-fg",
      },
    ],
    [stats],
  );

  const emptyState = useMemo(
    () => (
      <TableEmptyState
        icon={Users}
        title="No buyers in this view"
        description="Buyers matching this filter will appear here."
      />
    ),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            Buyer Management
          </h2>
          <p className="text-body text-sm">
            {loading ? "Loading..." : `${buyers.length} total buyers`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="border-line flex items-start gap-3 rounded-2xl border bg-white p-4"
          >
            <stat.icon size={20} className={`${stat.color} mt-1`} />
            <div className="flex-1">
              <p className="text-body text-xs font-semibold tracking-wider uppercase">
                {stat.label}
              </p>
              <p className="font-syne text-heading text-lg font-bold">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        rows={visible}
        columns={COLUMNS}
        caption="Buyer management"
        showSearch
        searchPlaceholder="Search buyers by name, email or phone"
        loading={loading}
        error={loadError}
        onRetry={() => void load()}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        /* The status filter lives on the page, so the engine is told when it
           changes or the viewer stays on a page that no longer exists. */
        resetKey={statusFilter}
        toolbar={
          <DashSelectButton
            label="Status"
            showInlineLabel
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
        emptyState={emptyState}
      />
    </div>
  );
}
