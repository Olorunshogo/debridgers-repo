import type { ComponentType, ReactNode } from "react";

/*
 * Types for the table engine.
 *
 * A consuming page declares a `columns` array describing its own rows, and the
 * engine renders it two ways: a real <table> on desktop and a stack of cards on
 * mobile, from the same definitions. The engine knows no column names, the same
 * way the dialog engine knows no dialog names.
 *
 * IMPORTANT: `columns` must be stable across renders. Declare it at module
 * scope, or wrap it in useMemo. An inline array is a new identity every render,
 * which re-derives every row on every keystroke.
 */

// === Layout

export type TableAlign = "left" | "center" | "right";

/** Padding scale. One scale for every table, so density cannot drift. */
export type TableDensity = "comfortable" | "compact";

/** How the engine renders. `auto` is cards below md, table from md up. */
export type TableRenderMode = "auto" | "table" | "cards";

/** Where the rows come from: sliced in the browser, or a page from the API. */
export type TableDataMode = "client" | "server";

/**
 * Where a column lands in card mode.
 *
 * - primary: the card headline, left of the top row. At most two read well.
 * - trailing: the right of the top row. Amounts and status pills.
 * - secondary: a label/value row in the card body, always visible.
 * - detail: collapsed behind the card's "More details" disclosure.
 * - actions: pinned to the card footer, and sticky-right in table mode.
 */
export type ColumnPriority =
  | "primary"
  | "trailing"
  | "secondary"
  | "detail"
  | "actions";

// === Sorting

export type SortDirection = "asc" | "desc";

export interface TableSort {
  /** A column's `sortKey`, which is what the server allowlist expects. */
  key: string;
  direction: SortDirection;
}

// === Columns

export interface TableColumn<TRow> {
  /** Stable identity. Also the default `sortKey`. */
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;

  align?: TableAlign;
  /** Any CSS width, applied as a min-width so content is never squeezed. */
  minWidth?: string;
  /** Defaults to "secondary". */
  priority?: ColumnPriority;
  /** Hides the header text visually but keeps it for screen readers. */
  headerSrOnly?: boolean;

  sortable?: boolean;
  /** Public sort key sent to the API. Defaults to `id`. */
  sortKey?: string;
  /** Client-mode comparator source. Required for sorting in client mode. */
  sortValue?: (row: TRow) => string | number | null | undefined;
  /** Client-mode search source. A column without one is not searched. */
  searchValue?: (row: TRow) => string;

  /** Card-mode label. Defaults to `header` when it is a string. */
  cardLabel?: ReactNode;
  /** Skips this column in card mode entirely. */
  hideInCards?: boolean;
  /** Skips this column in table mode entirely. */
  hideInTable?: boolean;
}

// === Row actions

export interface RowActionConfirm<TRow> {
  /** A key in the app's dialog registry. Opened via the dialog engine. */
  dialogKey: string;
  props?: (row: TRow) => Record<string, unknown>;
}

export interface RowAction<TRow> {
  id: string;
  /** Also the accessible name when the action renders icon-only. */
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Icon only in table mode; card mode always shows the label. */
  iconOnly?: boolean;
  onSelect?: (row: TRow) => void | Promise<void>;
  tone?: "default" | "primary" | "danger";
  hidden?: (row: TRow) => boolean;
  disabled?: (row: TRow) => boolean;
  /** Per-row in-flight state, so one row's spinner cannot block the others. */
  isBusy?: (row: TRow) => boolean;
  /** Routes through the dialog engine before `onSelect` runs. */
  confirm?: RowActionConfirm<TRow>;
}

// === Bulk actions

export interface BulkAction<TRow> {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: "default" | "primary" | "danger";
  onSelect: (rows: readonly TRow[]) => void | Promise<void>;
  disabled?: (rows: readonly TRow[]) => boolean;
}

// === State

export type RowId = string | number;

/** What the engine emits to a server-mode consumer on every meaningful change. */
export interface TableStateSnapshot {
  page: number;
  pageSize: number;
  /** Already debounced. */
  search: string;
  sort: TableSort | null;
}

export type PageSelectionState = "none" | "some" | "all";

export interface TableSelectionApi<TRow> {
  enabled: boolean;
  selectedIds: ReadonlySet<RowId>;
  count: number;
  isSelected: (row: TRow) => boolean;
  toggleRow: (row: TRow) => void;
  /*
   * Select-all covers the visible page only. In server mode the engine has
   * never seen the other pages, so claiming to select them would be a lie.
   */
  pageSelectionState: PageSelectionState;
  togglePage: () => void;
  clear: () => void;
  /** Selected rows among those currently visible. */
  selectedRows: TRow[];
}

export interface TableStateApi<TRow> {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  /** The raw input value, updated on every keystroke. */
  search: string;
  setSearch: (value: string) => void;
  /** The debounced value the engine actually filters and emits on. */
  debouncedSearch: string;

  sort: TableSort | null;
  setSort: (sort: TableSort | null) => void;
  /** asc, then desc, then off. */
  toggleSort: (key: string) => void;

  /** The rows to render: a client-side slice, or whatever the server returned. */
  visibleRows: TRow[];
  getRowId: (row: TRow) => RowId;
  /** 1-based index of the first visible row, for "Showing 11 to 20 of 84". */
  rangeStart: number;
  rangeEnd: number;

  selection: TableSelectionApi<TRow>;
  snapshot: TableStateSnapshot;
}
