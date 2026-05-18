import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { apiFetch, ApiError } from "../../../utils/apiFetch";
import { getAccessToken } from "../../../lib/auth";
import { BASE_BACKEND_URL } from "../../../utils/api";

export function meta() {
  return [{ title: "Products | Debridgers Admin" }];
}

interface Product {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface ProductForm {
  name: string;
  unit: string;
  price: string;
  description: string;
  image_url: string;
}

const emptyForm: ProductForm = {
  name: "",
  unit: "",
  price: "",
  description: "",
  image_url: "",
};

function fmt(kobo: number) {
  return (
    "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<Product[]>("/admin/products");
      setProducts(rows);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      unit: p.unit,
      price: String(p.price_kobo / 100),
      description: p.description ?? "",
      image_url: p.image_url ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAccessToken();
      const res = await fetch(`${BASE_BACKEND_URL}/admin/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as {
        data?: { url?: string };
        message?: string;
      };
      if (!res.ok)
        throw new Error(
          (json as { message?: string }).message ?? "Upload failed",
        );
      setForm((p) => ({ ...p, image_url: json.data?.url ?? "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    const priceNaira = parseFloat(form.price);
    if (
      !form.name.trim() ||
      !form.unit.trim() ||
      isNaN(priceNaira) ||
      priceNaira <= 0
    ) {
      setError("Name, unit, and a valid price are required.");
      return;
    }
    const price_kobo = Math.round(priceNaira * 100);
    setSaving(true);
    setError(null);
    try {
      if (editingId !== null) {
        await apiFetch(`/admin/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            unit: form.unit.trim(),
            price_kobo,
            description: form.description.trim() || undefined,
            image_url: form.image_url.trim() || null,
          }),
        });
      } else {
        await apiFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            unit: form.unit.trim(),
            price_kobo,
            description: form.description.trim() || undefined,
            image_url: form.image_url.trim() || undefined,
          }),
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      await apiFetch(`/admin/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      setProducts((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, is_active: !p.is_active } : x,
        ),
      );
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls =
    "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";
  const inputStyle = {
    borderColor: "var(--border-gray)",
    backgroundColor: "var(--bg-light)",
    color: "var(--heading-colour)",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} style={{ color: "var(--primary-color)" }} />
          <div>
            <h2
              className="font-syne text-xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Products
            </h2>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              Manage the product catalog for buyers and agents
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border p-5"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                className="font-syne font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {editingId !== null ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full p-1 hover:bg-black/5"
              >
                <X size={18} style={{ color: "var(--text-colour)" }} />
              </button>
            </div>

            {error && (
              <p
                className="mb-4 rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--status-cancelled-bg)",
                  color: "var(--status-cancelled-text)",
                }}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rice, Palm Oil"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Unit / Size *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modu, Half Bag, Full Bag"
                  value={form.unit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unit: e.target.value }))
                  }
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Price (₦) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1300"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  className={inputCls}
                  style={inputStyle}
                  min="1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Product Image
              </label>
              <div className="flex items-center gap-4">
                {form.image_url ? (
                  <div
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border"
                    style={{ borderColor: "var(--border-gray)" }}
                  >
                    <img
                      src={form.image_url}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed"
                    style={{
                      borderColor: "var(--border-gray)",
                      backgroundColor: "var(--bg-light)",
                    }}
                  >
                    <Package
                      size={28}
                      className="opacity-20"
                      style={{ color: "var(--text-colour)" }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImagePick}
                    className="hidden"
                    id="product-image-input"
                  />
                  <label
                    htmlFor="product-image-input"
                    className="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
                    style={{
                      borderColor: "var(--border-gray)",
                      color: "var(--heading-colour)",
                    }}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />{" "}
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImagePlus size={14} />{" "}
                        {form.image_url ? "Change Image" : "Upload Image"}
                      </>
                    )}
                  </label>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    JPG, PNG or WebP — max 5 MB
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                <Check size={15} />
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Product"
                    : "Add Product"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5"
                style={{
                  borderColor: "var(--border-gray)",
                  color: "var(--text-colour)",
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products table */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl"
                style={{ backgroundColor: "var(--bg-light)" }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package
              size={40}
              className="mx-auto mb-3 opacity-30"
              style={{ color: "var(--text-colour)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              No products yet. Click "Add Product" to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-gray)" }}>
                {["Product", "Unit / Size", "Price", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    borderBottom:
                      i < products.length - 1
                        ? "1px solid var(--border-gray)"
                        : undefined,
                  }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: "var(--bg-light)" }}
                        >
                          <Package
                            size={18}
                            className="opacity-30"
                            style={{ color: "var(--text-colour)" }}
                          />
                        </div>
                      )}
                      <div>
                        <p
                          className="font-medium"
                          style={{ color: "var(--heading-colour)" }}
                        >
                          {p.name}
                        </p>
                        {p.description && (
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-colour)" }}
                          >
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {p.unit}
                  </td>
                  <td
                    className="px-5 py-4 font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {fmt(p.price_kobo)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => void handleToggleActive(p)}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{
                        backgroundColor: p.is_active
                          ? "var(--status-delivered-bg)"
                          : "var(--status-cancelled-bg)",
                        color: p.is_active
                          ? "var(--status-delivered-text)"
                          : "var(--status-cancelled-text)",
                      }}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-black/5"
                        title="Edit"
                      >
                        <Pencil
                          size={15}
                          style={{ color: "var(--text-colour)" }}
                        />
                      </button>
                      <button
                        onClick={() => void handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="rounded-lg p-1.5 transition-colors hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
