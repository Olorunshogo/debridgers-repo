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
import {
  apiFetch,
  ApiError,
  getAccessToken,
  BASE_BACKEND_URL,
} from "@debridgers/api-client";
import {
  formatFromKobo,
  DashSelectInput,
  productCategoryOptions,
  fadeDownVariants,
  staggerItemVariants,
  staggerDelay,
  transitionBase,
} from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Products | Debridgers Admin" },
    {
      name: "description",
      content:
        "Manage the Debridgers product catalogue — add, update and price fresh foodstuff items.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type MeasureUnit = "kg" | "litre" | "piece";

interface Product {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  measure_value: number;
  measure_unit: MeasureUnit;
  is_active: boolean;
  sort_order: number;
}

interface ProductForm {
  name: string;
  unit: string;
  price: string;
  description: string;
  image_url: string;
  category: string;
  measure_value: string;
  measure_unit: MeasureUnit;
}

interface BundledImage {
  file: string;
  alt: string;
}

const emptyForm: ProductForm = {
  name: "",
  unit: "",
  price: "",
  description: "",
  image_url: "",
  category: "",
  measure_value: "",
  measure_unit: "kg",
};

const measureUnitOptions: { value: MeasureUnit; label: string }[] = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "litre", label: "Litre" },
  { value: "piece", label: "Piece" },
];

/*
 * Photos shipped with the app under public/images/products. Held as a literal
 * list rather than read at runtime because the folder is a build asset, and the
 * alt text has to be written by a human anyway.
 */
const bundledImages: BundledImage[] = [
  { file: "maize-1.jpg", alt: "Dried yellow maize grains in a heap" },
  { file: "maize-3.jpg", alt: "Fresh maize cobs with husks pulled back" },
  { file: "potatoes.jpg", alt: "Pile of unwashed brown potatoes" },
  { file: "pouring-oil.jpg", alt: "Cooking oil being poured into a bowl" },
  { file: "rice-bowl.jpg", alt: "Bowl filled with uncooked white rice" },
  { file: "rice-grains.jpg", alt: "Close-up of long grain rice" },
  { file: "rice-white.jpg", alt: "Spread of polished white rice grains" },
  { file: "sweet-beans.jpg", alt: "Brown honey beans in a scoop" },
  { file: "yams.jpg", alt: "Tubers of fresh yam laid side by side" },
];

const bundledImagePath = (file: string): string => `/images/products/${file}`;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
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
      category: p.category ?? "",
      measure_value: p.measure_value ? String(p.measure_value) : "",
      measure_unit: p.measure_unit ?? "kg",
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
    const parsedMeasure = parseInt(form.measure_value, 10);
    const measure_value = isNaN(parsedMeasure) ? undefined : parsedMeasure;
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
            category: form.category || null,
            measure_value,
            measure_unit: form.measure_unit,
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
            category: form.category || undefined,
            measure_value,
            measure_unit: form.measure_unit,
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
    "border-gray-border bg-bg-light text-heading w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Products
            </h2>
            <p className="text-text text-sm">
              Manage the product catalog for buyers and agents
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-syne text-heading font-semibold">
                {editingId !== null ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                type="button"
                aria-label="Close product form"
                onClick={() => setShowForm(false)}
                className="rounded-full p-1 hover:bg-black/5"
              >
                <X size={18} className="text-text" />
              </button>
            </div>

            {error && (
              <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
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
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
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
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
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
                  min="1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
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
                />
              </div>
              <DashSelectInput
                label="Category"
                name="category"
                placeholder="Select a category"
                options={productCategoryOptions()}
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="measure-value"
                    className="text-heading text-sm font-medium"
                  >
                    Measure Value
                  </label>
                  <input
                    id="measure-value"
                    type="number"
                    placeholder="e.g. 50"
                    value={form.measure_value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, measure_value: e.target.value }))
                    }
                    className={inputCls}
                    min="0"
                  />
                </div>
                <DashSelectInput
                  label="Measure Unit"
                  name="measure_unit"
                  options={measureUnitOptions}
                  value={form.measure_unit}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      measure_unit: e.target.value as MeasureUnit,
                    }))
                  }
                />
              </div>
            </div>

            {/* Image upload, bundled gallery and manual URL */}
            <div className="flex flex-col gap-4">
              <label className="text-heading text-sm font-medium">
                Product Image
              </label>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {form.image_url ? (
                  <div className="border-gray-border relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
                    <img
                      src={form.image_url}
                      alt={
                        form.name.trim()
                          ? `Current image for ${form.name.trim()}`
                          : "Currently selected product image"
                      }
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove the selected product image"
                      onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="border-gray-border bg-bg-light flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed">
                    <Package size={28} className="text-text opacity-20" />
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
                    className="border-gray-border text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
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
                  <p className="text-text text-xs">
                    JPG, PNG or WebP: max 5 MB
                  </p>
                </div>
              </div>

              {/* Bundled photo gallery */}
              <div className="flex flex-col gap-2">
                <p className="text-text text-xs font-medium">
                  Or pick one of the photos that ship with the app
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {bundledImages.map((img, i) => {
                    const path = bundledImagePath(img.file);
                    const isSelected = form.image_url === path;
                    return (
                      <motion.button
                        key={img.file}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`Use bundled photo: ${img.alt}`}
                        onClick={() =>
                          setForm((p) => ({ ...p, image_url: path }))
                        }
                        variants={staggerItemVariants}
                        initial="initial"
                        animate="animate"
                        transition={staggerDelay(i)}
                        className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-colors ${
                          isSelected
                            ? "border-primary ring-primary/30 ring-2"
                            : "border-gray-border hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={path}
                          alt={img.alt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <span className="bg-primary absolute right-1 bottom-1 flex h-5 w-5 items-center justify-center rounded-full text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Manual URL fallback */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="image-url"
                  className="text-heading text-sm font-medium"
                >
                  Image URL
                </label>
                <input
                  id="image-url"
                  type="text"
                  placeholder="https://... or /images/products/rice-bowl.jpg"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, image_url: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
                className="border-gray-border text-text rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products table */}
      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-bg-light h-12 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="text-text mx-auto mb-3 opacity-30" />
            <p className="text-text text-sm">
              No products yet. Click &quot;Add Product&quot; to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-gray-border border-b">
                {["Product", "Unit / Size", "Price", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-text px-5 py-3 text-left text-xs font-semibold tracking-wide uppercase"
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
                  className={
                    i < products.length - 1
                      ? "border-gray-border border-b"
                      : undefined
                  }
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
                        <div className="bg-bg-light flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <Package size={18} className="text-text opacity-30" />
                        </div>
                      )}
                      <div>
                        <p className="text-heading font-medium">{p.name}</p>
                        {p.description && (
                          <p className="text-text text-xs">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-text px-5 py-4">{p.unit}</td>
                  <td className="text-heading px-5 py-4 font-semibold">
                    {formatFromKobo(p.price_kobo)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => void handleToggleActive(p)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-75 ${
                        p.is_active
                          ? "bg-status-delivered-bg text-status-delivered-text"
                          : "bg-status-cancelled-bg text-status-cancelled-text"
                      }`}
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
                        <Pencil size={15} className="text-text" />
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
