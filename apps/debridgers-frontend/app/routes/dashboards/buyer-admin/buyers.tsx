import { useState, useEffect, useMemo } from "react";
import { Ban, Check, Users } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type TableColumn,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Manage Buyers | Buyer Admin" },
    {
      name: "description",
      content:
        "View and manage all buyers. Suspend or unsuspend buyer accounts.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface Buyer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_suspended: boolean;
  is_email_verified: boolean;
  joined_at: string;
}

function fullName(buyer: Buyer): string {
  return `${buyer.first_name} ${buyer.last_name}`;
}

export default function BuyerAdminBuyers() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* Previously a console.error and an empty list, which rendered a failed
     request as "No buyers found". */
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadBuyers();
  }, []);

  async function loadBuyers(): Promise<void> {
    setLoading(true);
    try {
      const data = await apiFetch<Buyer[]>("/admin/buyers");
      setBuyers(data);
      setLoadError(null);
    } catch (error) {
      setBuyers([]);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Could not load buyers. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* Counted over every buyer, not the search result: a total that shrinks as
     you type is not a total. */
  const suspendedCount = buyers.filter((b) => b.is_suspended).length;

  const columns = useMemo<TableColumn<Buyer>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        priority: "primary",
        minWidth: "14rem",
        sortable: true,
        sortValue: fullName,
        searchValue: (b) => `${fullName(b)} ${b.email} ${b.phone ?? ""}`,
        cell: (b) => (
          <TablePrimaryCell title={fullName(b)} subtitle={b.email} />
        ),
      },
      {
        id: "phone",
        header: "Phone",
        priority: "secondary",
        cell: (b) => <TableTextCell value={b.phone} />,
      },
      {
        id: "is_suspended",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (b) => (b.is_suspended ? 1 : 0),
        cell: (b) => (
          <TableStatusBadge
            label={b.is_suspended ? "Suspended" : "Active"}
            tone={b.is_suspended ? "danger" : "success"}
            icon={b.is_suspended ? <Ban size={13} /> : <Check size={13} />}
          />
        ),
      },
      {
        id: "is_email_verified",
        header: "Verified",
        priority: "detail",
        sortable: true,
        sortValue: (b) => (b.is_email_verified ? 1 : 0),
        cell: (b) => (
          <TableStatusBadge
            label={b.is_email_verified ? "Verified" : "Pending"}
            tone={b.is_email_verified ? "success" : "neutral"}
          />
        ),
      },
      {
        id: "joined_at",
        header: "Joined",
        priority: "detail",
        sortable: true,
        sortValue: (b) => b.joined_at,
        cell: (b) => <TableDateCell value={b.joined_at} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="border-line rounded-2xl border bg-white p-4">
          <p className="text-body mb-2 text-sm">Total Buyers</p>
          <p className="font-syne text-heading text-2xl font-bold">
            {buyers.length}
          </p>
        </div>
        <div className="border-line rounded-2xl border bg-white p-4">
          <p className="text-body mb-2 text-sm">Active</p>
          <p className="font-syne text-status-delivered-fg text-2xl font-bold">
            {buyers.length - suspendedCount}
          </p>
        </div>
        <div className="border-line rounded-2xl border bg-white p-4">
          <p className="text-body mb-2 text-sm">Suspended</p>
          <p className="font-syne text-status-cancelled-fg text-2xl font-bold">
            {suspendedCount}
          </p>
        </div>
      </div>

      <DataTable
        rows={buyers}
        columns={columns}
        caption="Buyers"
        showSearch
        searchPlaceholder="Search by name, email or phone"
        loading={loading}
        error={loadError}
        onRetry={() => void loadBuyers()}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyState={
          <TableEmptyState
            icon={Users}
            title="No buyers yet"
            description="Buyers who sign up will appear here."
          />
        }
      />
    </div>
  );
}
