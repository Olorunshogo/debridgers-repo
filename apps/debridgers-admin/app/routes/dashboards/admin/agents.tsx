import { useState, useEffect, useMemo, useCallback } from "react";
import { UserCheck, CheckCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import {
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableStatusBadge,
  TableEmptyState,
  type TableColumn,
  type RowAction,
  type StatusTone,
} from "@debridgers/ui-web";
import { apiFetch, ApiError } from "@debridgers/api-client";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Agents | Debridgers Admin",
    description:
      "View and manage all Debridgers field agents. Review applications, track performance and manage agent accounts.",
    path: "/agents",
    noIndex: true,
  });
}

type AgentStatus = "active" | "pending" | "suspended" | "rejected";

interface AgentRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: AgentStatus;
  joinedDate: string;
}

interface ApiAgent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  lga: string;
  applied_at: string;
}

function mapAgent(a: ApiAgent): AgentRow {
  const statusMap: Record<string, AgentStatus> = {
    approved: "active",
    pending: "pending",
    suspended: "suspended",
    rejected: "rejected",
  };
  return {
    id: a.id,
    name: `${a.first_name} ${a.last_name}`.trim(),
    email: a.email,
    phone: a.phone ?? "",
    location: a.lga ?? "",
    status: statusMap[a.status] ?? "pending",
    joinedDate: new Date(a.applied_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

const STATUS_BADGE: Record<AgentStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "active", label: "Active" },
  pending: { tone: "warning", label: "Pending" },
  suspended: { tone: "danger", label: "Suspended" },
  rejected: { tone: "danger", label: "Rejected" },
};

/* Module scope: an inline array is a new identity every render, which re-derives every row on every keystroke. See table-types.ts. */
const COLUMNS: readonly TableColumn<AgentRow>[] = [
  {
    id: "name",
    header: "Agent",
    priority: "primary",
    minWidth: "16rem",
    sortable: true,
    sortValue: (a) => a.name,
    searchValue: (a) => `${a.name} ${a.email} ${a.location}`,
    cell: (a) => <TablePrimaryCell title={a.name} subtitle={a.email} />,
  },
  {
    id: "location",
    header: "Area (LGA)",
    priority: "secondary",
    minWidth: "9rem",
    sortable: true,
    sortValue: (a) => a.location,
    cell: (a) => <TableTextCell value={a.location} />,
  },
  {
    id: "phone",
    header: "Phone",
    priority: "secondary",
    minWidth: "9rem",
    sortable: true,
    sortValue: (a) => a.phone,
    cell: (a) => <TableTextCell value={a.phone} />,
  },
  {
    id: "joinedDate",
    header: "Applied",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (a) => a.joinedDate,
    cell: (a) => <TableTextCell value={a.joinedDate} />,
  },
  {
    id: "status",
    header: "Status",
    priority: "trailing",
    align: "right",
    sortable: true,
    sortValue: (a) => STATUS_BADGE[a.status].label,
    cell: (a) => (
      <TableStatusBadge
        label={STATUS_BADGE[a.status].label}
        tone={STATUS_BADGE[a.status].tone}
      />
    ),
  },
];

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* A failed load must not render as "no agents", which is a different story. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await apiFetch<ApiAgent[]>("/admin/agents");
      setAgents(rows.map(mapAgent));
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load agents. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * One mutation path for all four transitions. They differ only in endpoint and resulting status, and four near-identical handlers is how the old file grew to 313 lines.
   */
  const mutateStatus = useCallback(
    async (
      id: number,
      request: RequestInit,
      path: string,
      nextStatus: AgentStatus,
      failureMessage: string,
    ): Promise<void> => {
      setActioningId(id);
      setActionError(null);
      try {
        await apiFetch(path, request);
        setAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)),
        );
      } catch (error) {
        setActionError(
          error instanceof ApiError ? error.message : failureMessage,
        );
      } finally {
        setActioningId(null);
      }
    },
    [],
  );

  const rowActions = useMemo<RowAction<AgentRow>[]>(
    () => [
      {
        id: "approve",
        label: "Approve",
        icon: CheckCircle,
        tone: "primary",
        hidden: (a) => a.status !== "pending",
        isBusy: (a) => actioningId === a.id,
        onSelect: (a) =>
          mutateStatus(
            a.id,
            { method: "PATCH", body: JSON.stringify({ status: "approved" }) },
            `/admin/agents/${a.id}/status`,
            "active",
            "Failed to approve",
          ),
      },
      {
        id: "reject",
        label: "Reject",
        icon: XCircle,
        tone: "danger",
        hidden: (a) => a.status !== "pending",
        isBusy: (a) => actioningId === a.id,
        onSelect: (a) =>
          mutateStatus(
            a.id,
            { method: "PATCH", body: JSON.stringify({ status: "rejected" }) },
            `/admin/agents/${a.id}/status`,
            "rejected",
            "Failed to reject",
          ),
      },
      {
        id: "suspend",
        label: "Suspend",
        icon: Ban,
        tone: "danger",
        hidden: (a) => a.status !== "active",
        isBusy: (a) => actioningId === a.id,
        onSelect: (a) =>
          mutateStatus(
            a.id,
            { method: "PATCH" },
            `/admin/agents/${a.id}/suspend`,
            "suspended",
            "Failed to suspend",
          ),
      },
      {
        id: "reinstate",
        label: "Reinstate",
        icon: RotateCcw,
        tone: "primary",
        hidden: (a) => a.status !== "suspended",
        isBusy: (a) => actioningId === a.id,
        onSelect: (a) =>
          mutateStatus(
            a.id,
            { method: "PATCH" },
            `/admin/agents/${a.id}/unsuspend`,
            "active",
            "Failed to reinstate",
          ),
      },
    ],
    [actioningId, mutateStatus],
  );

  const emptyState = useMemo(
    () => (
      <TableEmptyState
        icon={UserCheck}
        title="No agents yet"
        description="Agent applications appear here once people apply."
      />
    ),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <UserCheck size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">Agents</h2>
          <p className="text-body text-sm">
            {loading ? "Loading..." : `${agents.length} registered agents`}
          </p>
        </div>
      </div>

      {/* A failed action is not a failed load, so it reports separately. */}
      {actionError && (
        <p className="border-status-cancelled-fg text-status-cancelled-fg rounded-xl border px-4 py-2 text-sm">
          {actionError}
        </p>
      )}

      <DataTable
        rows={agents}
        columns={COLUMNS}
        actions={rowActions}
        caption="Agents"
        showSearch
        searchPlaceholder="Search agents by name, email or area"
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
