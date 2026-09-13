import { useMemo } from "react";
import { Wallet } from "lucide-react";
import {
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type StatusTone,
  type TableColumn,
} from "@debridgers/ui-web";
import type { CommissionStatus } from "@debridgers/domain-status";
import type { CommissionRow } from "./types";

const STATUS_PRESENTATION: Record<
  CommissionStatus,
  { tone: StatusTone; label: string }
> = {
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "warning", label: "Confirmed" },
  paid: { tone: "success", label: "Paid" },
  reversed: { tone: "danger", label: "Reversed" },
};

export interface CommissionsTableProps {
  rows: CommissionRow[];
  loading: boolean;
}

export function CommissionsTable({ rows, loading }: CommissionsTableProps) {
  const columns = useMemo<TableColumn<CommissionRow>[]>(
    () => [
      {
        id: "description",
        header: "Commission",
        priority: "primary",
        minWidth: "14rem",
        searchValue: (row) => row.description,
        cell: (row) => <TablePrimaryCell title={row.description} />,
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
        header: "Date",
        priority: "detail",
        sortable: true,
        sortValue: (row) => row.date,
        cell: (row) => <TableDateCell value={row.date} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      caption="Commission history"
      showSearch
      searchPlaceholder="Search commissions"
      loading={loading}
      initialSort={{ key: "date", direction: "desc" }}
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        <TableEmptyState
          icon={Wallet}
          title="No commissions yet"
          description="Sell stock or refer buyers to earn commission."
        />
      }
    />
  );
}

CommissionsTable.displayName = "CommissionsTable";
