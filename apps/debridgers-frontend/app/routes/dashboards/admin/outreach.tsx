import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Plus,
  Trash2,
  Users,
  ShoppingBag,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  fadeDownVariants,
  transitionBase,
  TextInputField,
  NumberInputField,
  DateInputField,
  SelectInputField,
  SelectButtonField,
  TextareaField,
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableStatusBadge,
  TableEmptyState,
  type TableColumn,
  type RowAction,
} from "@debridgers/ui-web";
import { kadunaLgas, kadunaAreas, kadunaAreasByLga } from "@/models/models";

export function meta() {
  return [
    { title: "Outreach Records | Debridgers Admin" },
    {
      name: "description",
      content:
        "View and manage outreach records — track leads, follow-ups and conversion progress.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface OutreachRecord {
  id: number;
  shop_name: string;
  owner_name: string | null;
  phone: string | null;
  lga: string | null;
  area: string | null;
  address: string | null;
  product_interest: string | null;
  quantity: number | null;
  notes: string | null;
  collected_by: string | null;
  visit_date: string;
  created_at: string;
}

interface FormState {
  shop_name: string;
  owner_name: string;
  phone: string;
  lga: string;
  area: string;
  address: string;
  product_interest: string;
  quantity: string;
  notes: string;
  collected_by: string;
  visit_date: string;
}

const emptyForm: FormState = {
  shop_name: "",
  owner_name: "",
  phone: "",
  lga: "",
  area: "",
  address: "",
  product_interest: "",
  quantity: "",
  notes: "",
  collected_by: "",
  visit_date: new Date().toISOString().slice(0, 10),
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/*
 * Locations are stored two ways.
 *
 * Rows written before the picker existed hold the display label ("Kaduna
 * South", "Narayi"); the picker submits the option's slug ("kaduna-south",
 * "narayi"). A direct === between the two never matched, so choosing any
 * location filtered every row away and only "All Locations" appeared to work.
 *
 * Normalising both sides fixes the existing rows and keeps working once every
 * row is slug-shaped, since slugging a slug is a no-op.
 */
function toLocationSlug(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

/*
 * Seven columns was the cramped table. LGA, Area and Date drop to "detail", so
 * the engine collapses them behind the card disclosure on narrow viewports
 * instead of squeezing every column until the shop name is unreadable.
 *
 * Module scope: an inline array re-derives every row on every keystroke.
 */
const COLUMNS: readonly TableColumn<OutreachRecord>[] = [
  {
    id: "shop_name",
    header: "Shop / Customer",
    priority: "primary",
    minWidth: "16rem",
    sortable: true,
    sortValue: (r) => r.shop_name,
    searchValue: (r) =>
      `${r.shop_name} ${r.owner_name ?? ""} ${r.address ?? ""}`,
    cell: (r) => (
      <TablePrimaryCell
        title={r.shop_name}
        subtitle={[r.owner_name, r.address].filter(Boolean).join(" · ")}
      />
    ),
  },
  {
    id: "phone",
    header: "Phone",
    priority: "secondary",
    minWidth: "10rem",
    searchValue: (r) => r.phone ?? "",
    cell: (r) =>
      r.phone ? (
        <div className="flex flex-col gap-1">
          {r.phone
            .split("/")
            .map((num) => num.trim())
            .filter(Boolean)
            .map((num) => (
              <a
                key={num}
                href={`tel:${num.replace(/\s/g, "")}`}
                className="text-primary flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              >
                <Phone size={11} />
                {num}
              </a>
            ))}
        </div>
      ) : (
        <TableTextCell value={null} />
      ),
  },
  {
    id: "lga",
    header: "LGA",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (r) => r.lga ?? "",
    searchValue: (r) => r.lga ?? "",
    cell: (r) => (
      <TableTextCell
        value={
          r.lga
            ? (kadunaLgas.find((l) => l.value === toLocationSlug(r.lga))
                ?.label ?? r.lga)
            : null
        }
      />
    ),
  },
  {
    id: "area",
    header: "Area",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (r) => r.area ?? "",
    searchValue: (r) => r.area ?? "",
    cell: (r) => (
      <TableTextCell
        value={
          r.area
            ? (kadunaAreas.find((a) => a.value === toLocationSlug(r.area))
                ?.label ?? r.area)
            : null
        }
      />
    ),
  },
  {
    id: "product_interest",
    header: "Interest",
    priority: "secondary",
    minWidth: "12rem",
    sortable: true,
    sortValue: (r) => r.product_interest ?? "",
    searchValue: (r) => r.product_interest ?? "",
    cell: (r) => (
      <div className="flex flex-col items-start gap-1">
        <TableTextCell value={r.product_interest} />
        {r.quantity ? (
          <TableStatusBadge
            tone="active"
            label={`${r.quantity} bag${r.quantity !== 1 ? "s" : ""}`}
          />
        ) : null}
      </div>
    ),
  },
  {
    id: "visit_date",
    header: "Date",
    priority: "detail",
    align: "right",
    minWidth: "7rem",
    sortable: true,
    sortValue: (r) => r.visit_date,
    cell: (r) => (
      <TableTextCell
        value={new Date(r.visit_date).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
        })}
      />
    ),
  },
];

export default function AdminOutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    visit_date: todayString(),
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterLga, setFilterLga] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  /* A failed load must not render as "no outreach yet", which is a different
     story, so the table gets its own error and retry. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /* `formError` sits inside the add panel, so delete failures need their own. */
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<OutreachRecord[]>("/admin/outreach");
      setRecords(rows);
      setLoadError(null);
    } catch (err) {
      setRecords([]);
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Could not load outreach records. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /* Only the location filter is applied here; search, sort and paging are the
     engine's job now. */
  const visible = useMemo<OutreachRecord[]>(() => {
    if (!filterLga) return records;
    const target = toLocationSlug(filterLga);
    return records.filter(
      (r) =>
        toLocationSlug(r.lga) === target || toLocationSlug(r.area) === target,
    );
  }, [records, filterLga]);

  const stats = useMemo(() => {
    const uniqueAreas = new Set(records.map((r) => r.lga).filter(Boolean)).size;
    const totalQty = records.reduce((s, r) => s + (r.quantity ?? 0), 0);
    return { total: records.length, areas: uniqueAreas, totalQty };
  }, [records]);

  function handleChange(field: keyof FormState) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name.trim()) {
      setFormError("Shop/customer name is required.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch("/admin/outreach", {
        method: "POST",
        body: JSON.stringify({
          shop_name: form.shop_name.trim(),
          owner_name: form.owner_name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          lga: form.lga || undefined,
          area: form.area || undefined,
          address: form.address.trim() || undefined,
          product_interest: form.product_interest.trim() || undefined,
          quantity: form.quantity ? parseInt(form.quantity, 10) : undefined,
          notes: form.notes.trim() || undefined,
          collected_by: form.collected_by.trim() || undefined,
          visit_date: form.visit_date,
        }),
      });
      setShowForm(false);
      setForm({ ...emptyForm, visit_date: todayString() });
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to save. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setActionError(null);
    try {
      await apiFetch(`/admin/outreach/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not delete that record. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const rowActions = useMemo<RowAction<OutreachRecord>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        iconOnly: true,
        tone: "danger",
        isBusy: (r) => deletingId === r.id,
        onSelect: (r) => handleDelete(r.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (r) => ({
            title: `Delete ${r.shop_name}?`,
            description:
              "This removes the outreach record permanently. Field notes and contact details for this visit cannot be recovered.",
            confirmLabel: "Delete record",
          }),
        },
      },
    ],
    [deletingId],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MapPin size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Outreach Records
            </h2>
            <p className="text-body text-sm">
              Offline customer data collected during field visits
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ ...emptyForm, visit_date: todayString() });
            setFormError(null);
            setShowForm(true);
          }}
          className="bg-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} /> Record Visit
        </button>
      </div>

      {/* Page-level failures: load, delete */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-cancelled text-status-cancelled-fg flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setActionError(null)}
              className="shrink-0 rounded-full p-0.5 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Visits", value: stats.total, icon: Users },
          { label: "Areas Covered", value: stats.areas, icon: MapPin },
          {
            label: "Total Units Interest",
            value: stats.totalQty,
            icon: ShoppingBag,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="border-line flex flex-col gap-2 rounded-2xl border bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-body text-xs">{s.label}</span>
              <s.icon size={16} className="text-primary" />
            </div>
            <p className="font-syne text-heading text-2xl font-bold">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-line rounded-2xl border bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-syne text-heading font-semibold">
                Record New Visit
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full p-1 hover:bg-black/5"
              >
                <X size={18} className="text-body" />
              </button>
            </div>

            {formError && (
              <p className="bg-status-cancelled text-status-cancelled-fg mb-4 rounded-xl px-4 py-3 text-sm">
                {formError}
              </p>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInputField
                  label="Shop / Customer Name"
                  placeholder="e.g. Mama Ngozi's Store"
                  value={form.shop_name}
                  onChange={handleChange("shop_name")}
                  required
                />
                <TextInputField
                  label="Owner / Contact Name"
                  placeholder="e.g. Ngozi Eze"
                  value={form.owner_name}
                  onChange={handleChange("owner_name")}
                />
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInputField
                  label="Phone Number"
                  type="tel"
                  inputMode="tel"
                  placeholder="08012345678"
                  value={form.phone}
                  onChange={handleChange("phone")}
                />
                <SelectInputField
                  label="LGA"
                  placeholder="Select LGA"
                  options={kadunaLgas}
                  value={form.lga}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lga: e.target.value, area: "" }))
                  }
                />
                <SelectInputField
                  label="Area"
                  placeholder={
                    form.lga && kadunaAreasByLga[form.lga]
                      ? "Select area"
                      : "Select LGA first"
                  }
                  options={kadunaAreasByLga[form.lga] ?? []}
                  value={form.area}
                  onChange={handleChange("area")}
                  disabled={!form.lga || !kadunaAreasByLga[form.lga]}
                />
              </div>

              {/* Row 3 */}
              <TextInputField
                label="Address / Landmark"
                placeholder="e.g. No. 5 Kaura Market, near GTBank"
                value={form.address}
                onChange={handleChange("address")}
              />

              {/* Row 4 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextInputField
                  label="Products Interested In"
                  className="sm:col-span-2"
                  placeholder="e.g. Rice, Palm Oil, Beans"
                  value={form.product_interest}
                  onChange={handleChange("product_interest")}
                />
                <NumberInputField
                  label="Quantity (bags)"
                  min={1}
                  placeholder="0"
                  value={form.quantity}
                  onChange={handleChange("quantity")}
                />
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInputField
                  label="Collected By"
                  placeholder="Staff or agent name"
                  value={form.collected_by}
                  onChange={handleChange("collected_by")}
                />
                <DateInputField
                  label="Visit Date"
                  value={form.visit_date}
                  onChange={handleChange("visit_date")}
                />
              </div>

              {/* Notes */}
              <TextareaField
                label="Notes / Feedback"
                rows={3}
                placeholder="Any additional observations, customer feedback, follow-up needed..."
                value={form.notes}
                onChange={handleChange("notes")}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Record"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border-line text-body rounded-full border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        rows={visible}
        columns={COLUMNS}
        actions={rowActions}
        caption="Outreach records"
        showSearch
        searchPlaceholder="Search by shop, owner, phone or area"
        loading={loading}
        error={loadError}
        onRetry={() => void load()}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        /* The location filter lives on the page, so the engine is told when it
           changes or the viewer stays on a page that no longer exists. */
        resetKey={filterLga}
        toolbar={
          <SelectButtonField
            label="Location"
            placeholder="All Locations"
            className="sm:w-64"
            searchable
            options={[
              /* Explicit reset entry: without it there is no way back to unfiltered. */
              { value: "", label: "All Locations" },
              ...kadunaLgas.map((l) => ({
                value: l.value,
                label: `${l.label} LGA`,
              })),
              ...kadunaAreas,
            ]}
            value={filterLga}
            onChange={setFilterLga}
          />
        }
        emptyState={
          <TableEmptyState
            icon={MapPin}
            title="No outreach records"
            description={'Click "Record Visit" to add your first entry.'}
          />
        }
      />
    </div>
  );
}
