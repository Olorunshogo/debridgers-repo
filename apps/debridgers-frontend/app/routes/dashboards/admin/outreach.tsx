import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Plus,
  Trash2,
  Search,
  Users,
  ShoppingBag,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
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

const inputCls =
  "border-gray-border bg-bg-light text-heading w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";

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
  const [search, setSearch] = useState("");
  const [filterLga, setFilterLga] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<OutreachRecord[]>("/admin/outreach");
      setRecords(rows);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (filterLga)
      list = list.filter((r) => r.lga === filterLga || r.area === filterLga);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.shop_name.toLowerCase().includes(q) ||
          (r.owner_name ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").includes(q) ||
          (r.lga ?? "").toLowerCase().includes(q) ||
          (r.area ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [records, search, filterLga]);

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
    try {
      await apiFetch(`/admin/outreach/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

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
            <p className="text-text text-sm">
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
            className="border-gray-border flex flex-col gap-2 rounded-2xl border bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-text text-xs">{s.label}</span>
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
            className="border-gray-border rounded-2xl border bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-syne text-heading font-semibold">
                Record New Visit
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full p-1 hover:bg-black/5"
              >
                <X size={18} className="text-text" />
              </button>
            </div>

            {formError && (
              <p className="bg-status-cancelled-bg text-status-cancelled-text mb-4 rounded-xl px-4 py-3 text-sm">
                {formError}
              </p>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Shop / Customer Name{" "}
                    <span className="text-error-red">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mama Ngozi's Store"
                    value={form.shop_name}
                    onChange={handleChange("shop_name")}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Owner / Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ngozi Eze"
                    value={form.owner_name}
                    onChange={handleChange("owner_name")}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    LGA
                  </label>
                  <select
                    value={form.lga}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, lga: e.target.value, area: "" }));
                    }}
                    className={inputCls}
                  >
                    <option value="">Select LGA</option>
                    {kadunaLgas.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Area
                  </label>
                  <select
                    value={form.area}
                    onChange={handleChange("area")}
                    className={inputCls}
                    disabled={!form.lga || !kadunaAreasByLga[form.lga]}
                  >
                    <option value="">
                      {form.lga && kadunaAreasByLga[form.lga]
                        ? "Select area"
                        : "Select LGA first"}
                    </option>
                    {(kadunaAreasByLga[form.lga] ?? []).map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Address / Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. No. 5 Kaura Market, near GTBank"
                  value={form.address}
                  onChange={handleChange("address")}
                  className={inputCls}
                />
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-heading text-sm font-medium">
                    Products Interested In
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rice, Palm Oil, Beans"
                    value={form.product_interest}
                    onChange={handleChange("product_interest")}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Quantity (bags)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.quantity}
                    onChange={handleChange("quantity")}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Collected By
                  </label>
                  <input
                    type="text"
                    placeholder="Staff or agent name"
                    value={form.collected_by}
                    onChange={handleChange("collected_by")}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-heading text-sm font-medium">
                    Visit Date
                  </label>
                  <input
                    type="date"
                    value={form.visit_date}
                    onChange={handleChange("visit_date")}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Notes / Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional observations, customer feedback, follow-up needed..."
                  value={form.notes}
                  onChange={handleChange("notes")}
                  className="border-gray-border bg-bg-light text-heading w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none"
                />
              </div>

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
                  className="border-gray-border text-text rounded-full border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="border-gray-border flex flex-1 items-center gap-2 rounded-full border bg-white px-4 py-2">
          <Search size={15} className="text-text" />
          <input
            type="text"
            placeholder="Search by name, phone, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-heading w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={filterLga}
          onChange={(e) => setFilterLga(e.target.value)}
          className="border-gray-border text-heading rounded-full border bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="">All Locations</option>
          <optgroup label="── By LGA ──">
            {kadunaLgas.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} LGA
              </option>
            ))}
          </optgroup>
          <optgroup label="── By Area ──">
            {kadunaAreas.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Records table */}
      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-gray-border text-text grid grid-cols-[1fr_120px_100px_100px_1fr_80px_40px] gap-3 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
          <span>Shop / Customer</span>
          <span>Phone</span>
          <span>LGA</span>
          <span>Area</span>
          <span>Interest</span>
          <span>Date</span>
          <span />
        </div>

        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border-gray-border h-14 animate-pulse border-b ${i % 2 === 0 ? "bg-bg-light" : "bg-white"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <MapPin size={40} className="text-text opacity-20" />
            <p className="text-text text-sm">
              {records.length === 0
                ? 'No outreach records yet. Click "Record Visit" to add your first entry.'
                : "No records match your search."}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-gray-border grid grid-cols-[1fr_120px_100px_100px_1fr_80px_40px] items-center gap-3 border-b px-5 py-4 text-sm last:border-0"
              >
                {/* Shop */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-heading font-semibold">{r.shop_name}</p>
                  {r.owner_name && (
                    <p className="text-text text-xs">{r.owner_name}</p>
                  )}
                  {r.address && (
                    <p className="text-text text-xs">{r.address}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  {r.phone ? (
                    r.phone
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
                      ))
                  ) : (
                    <span className="text-xs opacity-40">—</span>
                  )}
                </div>

                {/* LGA */}
                <span className="text-text text-xs">
                  {r.lga
                    ? (kadunaLgas.find((l) => l.value === r.lga)?.label ??
                      r.lga)
                    : "—"}
                </span>

                {/* Area */}
                <span className="text-heading text-xs">
                  {r.area
                    ? (kadunaAreas.find((a) => a.value === r.area)?.label ??
                      r.area)
                    : "—"}
                </span>

                {/* Interest */}
                <div className="flex flex-col gap-0.5">
                  {r.product_interest ? (
                    <span className="text-heading">{r.product_interest}</span>
                  ) : (
                    <span className="text-xs opacity-40">—</span>
                  )}
                  {r.quantity ? (
                    <span className="bg-status-active-bg text-status-active-text w-fit rounded-full px-2 py-0.5 text-xs font-semibold">
                      {r.quantity} bag{r.quantity !== 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>

                {/* Date */}
                <span className="text-text text-xs">
                  {new Date(r.visit_date).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>

                {/* Delete */}
                <button
                  onClick={() => void handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-red-50 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Notes detail drawer hint */}
      {filtered.some((r) => r.notes) && (
        <p className="text-text text-xs">
          * Hover a row to see full notes in future updates.
        </p>
      )}
    </div>
  );
}
