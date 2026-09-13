import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableDateCell,
  TableTextCell,
  TableStatusBadge,
  TableEmptyState,
  type StatusTone,
  type TableColumn,
} from "@debridgers/ui-web";
import type { WithdrawalStatus } from "@debridgers/domain-status";
import type { WithdrawalRow } from "./types";

const STATUS_PRESENTATION: Record<
  WithdrawalStatus,
  { tone: StatusTone; label: string }
> = {
  pending: { tone: "warning", label: "Pending review" },
  approved: { tone: "info", label: "Approved" },
  processing: { tone: "info", label: "Processing" },
  paid: { tone: "success", label: "Paid" },
  rejected: { tone: "danger", label: "Rejected" },
  failed: { tone: "danger", label: "Transfer failed" },
};

export interface WithdrawalsTableProps {
  rows: WithdrawalRow[];
  loading: boolean;
}

export function WithdrawalsTable({ rows, loading }: WithdrawalsTableProps) {
  const columns = useMemo<TableColumn<WithdrawalRow>[]>(
    () => [
      {
        id: "request",
        header: "Request",
        priority: "primary",
        minWidth: "12rem",
        searchValue: (row) => row.reference ?? "",
        cell: (row) => (
          <TablePrimaryCell
            title="Payout request"
            subtitle={row.reference ? `Ref ${row.reference}` : undefined}
          />
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        priority: "trailing",
        sortable: true,
        sortValue: (row) => row.amount,
        cell: (row) => <TableAmountCell kobo={row.amount} />,
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
        id: "date",
        header: "Requested",
        priority: "detail",
        sortable: true,
        sortValue: (row) => row.date,
        cell: (row) => <TableDateCell value={row.date} />,
      },
      {
        id: "reason",
        header: "Reason",
        priority: "detail",
        cell: (row) => (
          <TableTextCell
            value={row.rejectionReason ?? row.errorMessage}
            className="text-status-cancelled-fg"
          />
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      caption="Payout history"
      loading={loading}
      initialSort={{ key: "date", direction: "desc" }}
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        <TableEmptyState
          icon={ArrowUpRight}
          title="No payout requests yet"
          description="Requested payouts will appear here."
        />
      }
    />
  );
}

WithdrawalsTable.displayName = "WithdrawalsTable";
