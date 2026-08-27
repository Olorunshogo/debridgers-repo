import { useState, useEffect, useMemo, useCallback } from "react";
import { ShoppingBag } from "lucide-react";
import {
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableStatusBadge,
  TableEmptyState,
  type TableColumn,
  type StatusTone,
} from "@debridgers/ui-web";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Buyers | Debridgers Admin" },
    {
      name: "description",
      content:
        "View and manage all Debridgers buyer accounts. Track orders, activity and account details.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type BuyerStatus = "active" | "inactive";

interface BuyerRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  status: BuyerStatus;
  joinedDate: string;
}

interface ApiBuyer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_email_verified: boolean;
  is_blocked: boolean;
  joined_at: string;
}

function mapBuyer(b: ApiBuyer): BuyerRow {
  return {
    id: b.id,
    name: `${b.first_name} ${b.last_name}`.trim(),
    email: b.email,
    phone: b.phone ?? "",
    verified: b.is_email_verified,
    status: b.is_blocked ? "inactive" : "active",
    joinedDate: new Date(b.joined_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

const STATUS_BADGE: Record<BuyerStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "active", label: "Active" },
  inactive: { tone: "danger", label: "Blocked" },
};

/*
 * Module scope, not inline: the engine re-derives every row when the `columns`
 * identity changes, which for an inline array is every keystroke in the search
 * box. See the note in table-types.ts.
 */
const COLUMNS: readonly TableColumn<BuyerRow>[] = [
  {
    id: "name",
    header: "Buyer",
    priority: "primary",
    minWidth: "14rem",
    sortable: true,
    sortValue: (b) => b.name,
    searchValue: (b) => `${b.name} ${b.phone}`,
    cell: (b) => (
      <TablePrimaryCell
        title={b.name}
        subtitle={b.verified ? "Verified" : undefined}
      />
    ),
  },
  {
    id: "email",
    header: "Email",
    priority: "secondary",
    /* The column that used to vanish: a 1fr share of a crushed grid with no way
       to scroll to it. A real minimum plus the engine's scroll container. */
    minWidth: "16rem",
    sortable: true,
    sortValue: (b) => b.email,
    searchValue: (b) => b.email,
    cell: (b) => <TableTextCell value={b.email} />,
  },
  {
    id: "phone",
    header: "Phone",
    priority: "secondary",
    minWidth: "9rem",
    sortable: true,
    sortValue: (b) => b.phone,
    cell: (b) => <TableTextCell value={b.phone} />,
  },
  {
    id: "joinedDate",
    header: "Joined",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (b) => b.joinedDate,
    cell: (b) => <TableTextCell value={b.joinedDate} />,
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

export default function AdminBuyers() {
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* A failed load must not render as "no buyers", which is a different story. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await apiFetch<ApiBuyer[]>("/admin/buyers");
      setBuyers(rows.map(mapBuyer));
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

  const emptyState = useMemo(
    () => (
      <TableEmptyState
        icon={ShoppingBag}
        title="No buyers yet"
        description="Buyer accounts appear here once people register."
      />
    ),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ShoppingBag size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">Buyers</h2>
          <p className="text-body text-sm">
            {loading ? "Loading..." : `${buyers.length} registered buyers`}
          </p>
        </div>
      </div>

      <DataTable
        rows={buyers}
        columns={COLUMNS}
        caption="Buyers"
        showSearch
        searchPlaceholder="Search buyers by name, email or phone"
        loading={loading}
        error={loadError}
        onRetry={() => void load()}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyState={emptyState}
      />
    </div>
  );
}
