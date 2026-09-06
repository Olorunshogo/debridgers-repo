import { useState, useEffect, useMemo, useRef } from "react";
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
  SelectInputField,
  TextInputField,
  NumberInputField,
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableStatusBadge,
  TableTextCell,
  TableEmptyState,
  fadeDownVariants,
  staggerItemVariants,
  staggerDelay,
  transitionBase,
  type RowAction,
  type TableColumn,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Products | Debridgers Admin",
    description:
      "Manage the Debridgers product catalogue — add, update and price fresh foodstuff items.",
    path: "/products",
    noIndex: true,
  });
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
  category_id: number | null;
  /* Leaf name from the taxonomy join, for the list row. */
  category_name: string | null;
  measure_value: number | null;
  measure_unit: MeasureUnit;
  weight_grams: number | null;
  is_active: boolean;
  sort_order: number;
}

interface ProductForm {
  name: string;
  unit: string;
  price: string;
  description: string;
  image_url: string;
  /*
   * Numeric fields are held as strings because that is what an input yields.
   * The conversion at each end is the form boundary, not redundancy: the API
   * types these as numbers, and did so falsely until `measure_value` became an
   * integer column. Keep the parse honest rather than removing it.
   */
  category_id: string;
  measure_value: string;
  measure_unit: MeasureUnit;
  weight_grams: string;
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
  category_id: "",
  measure_value: "",
  measure_unit: "kg",
  weight_grams: "",
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

interface CategoryLeaf {
  id: number;
  name: string;
  /* "Grains > Rice > Ofada". A leaf name alone is ambiguous. */
  path: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryLeaves, setCategoryLeaves] = useState<CategoryLeaf[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * The `error` banner above lives inside the add/edit panel, so it cannot
   * report failures triggered from the list itself. This one sits at page level.
   */
  const [actionError, setActionError] = useState<string | null>(null);
  /* Distinct from actionError: a failed load must not render as "no products",
     which is a different story entirely. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [rows, leaves] = await Promise.all([
        apiFetch<Product[]>("/admin/products"),
        apiFetch<CategoryLeaf[]>("/admin/categories/leaves"),
      ]);
      setProducts(rows);
      setCategoryLeaves(leaves);
      setLoadError(null);
    } catch (err) {
      setProducts([]);
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Could not load products. Check your connection and retry.",
      );
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
      category_id: p.category_id ? String(p.category_id) : "",
      measure_value: p.measure_value === null ? "" : String(p.measure_value),
      measure_unit: p.measure_unit ?? "kg",
      weight_grams: p.weight_grams === null ? "" : String(p.weight_grams),
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
    /* Blank means "not set", so send undefined rather than 0. */
    const toOptionalInt = (raw: string): number | undefined => {
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? undefined : parsed;
    };
    const measure_value = toOptionalInt(form.measure_value);
    const weight_grams = toOptionalInt(form.weight_grams);
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
            category_id: form.category_id ? Number(form.category_id) : null,
            measure_value,
            measure_unit: form.measure_unit,
            weight_grams,
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
            category_id: form.category_id
              ? Number(form.category_id)
              : undefined,
            measure_value,
            measure_unit: form.measure_unit,
            weight_grams,
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
    setActionError(null);
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
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : `Could not update "${p.name}". Please try again.`,
      );
    }
  }

  /*
   * Throws rather than swallowing: the confirm dialog runs this, and it is the
   * dialog that shows the failure and stays open. Catching here would close it
   * on a delete that never happened.
   */
  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      throw new Error(
        err instanceof ApiError
          ? err.message
          : "Could not delete that product. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
   * Memoised, as the table engine requires: an inline array would be a new
   * identity every render and re-derive every row on each keystroke.
   */
  const columns = useMemo<TableColumn<Product>[]>(
    () => [
      {
        id: "name",
        header: "Product",
        priority: "primary",
        minWidth: "16rem",
        sortable: true,
        sortValue: (p) => p.name,
        searchValue: (p) =>
          `${p.name} ${p.unit} ${p.category_name ?? ""} ${p.description ?? ""}`,
        cell: (p) => (
          <TablePrimaryCell
            title={p.name}
            subtitle={p.description}
            leading={
              p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="bg-light-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Package size={18} className="text-body opacity-30" />
                </div>
              )
            }
          />
        ),
      },
      {
        id: "unit",
        header: "Unit / Size",
        priority: "secondary",
        sortable: true,
        sortValue: (p) => p.unit,
        cell: (p) => <TableTextCell value={p.unit} />,
      },
      {
        id: "category",
        header: "Category",
        priority: "detail",
        sortable: true,
        sortValue: (p) => p.category_name ?? "",
        cell: (p) => <TableTextCell value={p.category_name} />,
      },
      {
        id: "price_kobo",
        header: "Price",
        align: "right",
        priority: "trailing",
        sortable: true,
        sortValue: (p) => p.price_kobo,
        cell: (p) => <TableAmountCell kobo={p.price_kobo} />,
      },
      {
        id: "is_active",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (p) => (p.is_active ? 1 : 0),
        cell: (p) => (
          <button
            type="button"
            title={p.is_active ? "Deactivate product" : "Activate product"}
            onClick={(event) => {
              /* The row is not clickable here, but the badge must not become
                 one either if that changes. */
              event.stopPropagation();
              void handleToggleActive(p);
            }}
            className="cursor-pointer transition-opacity duration-200 hover:opacity-75"
          >
            <TableStatusBadge
              label={p.is_active ? "Active" : "Inactive"}
              tone={p.is_active ? "success" : "danger"}
            />
          </button>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Product>[]>(
    () => [
      {
        id: "edit",
        label: "Edit",
        icon: Pencil,
        iconOnly: true,
        onSelect: openEdit,
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        iconOnly: true,
        tone: "danger",
        isBusy: (p) => deletingId === p.id,
        onSelect: (p) => handleDelete(p.id),
        confirm: {
          dialogKey: "CONFIRM",
          props: (p) => ({
            title: `Delete ${p.name}?`,
            description:
              "This removes the product from the catalog. Buyers will no longer see it.",
            confirmLabel: "Delete product",
          }),
        },
      },
    ],
    [deletingId],
  );

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
            <p className="text-body text-sm">
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

      {/* Page-level failures: load, toggle, delete */}
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

      {/* Add / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5"
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
                <X size={18} className="text-body" />
              </button>
            </div>

            {error && (
              <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TextInputField
                label="Product Name"
                required
                placeholder="e.g. Rice, Palm Oil"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <TextInputField
                label="Unit / Size"
                required
                placeholder="e.g. Modu, Half Bag, Full Bag"
                value={form.unit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unit: e.target.value }))
                }
              />
              <NumberInputField
                label="Price (₦)"
                required
                min={1}
                placeholder="e.g. 1300"
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value }))
                }
              />
              <TextInputField
                label="Description"
                placeholder="Optional note"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
              {/*
                Bound to a taxonomy leaf, shown with its full path so "White" is
                distinguishable as garri or beans. Searchable because the leaf
                list grows with every variety added.
              */}
              <SelectInputField
                label="Category"
                name="category_id"
                placeholder="Select a category"
                searchable
                options={categoryLeaves.map((leaf) => ({
                  value: String(leaf.id),
                  label: leaf.path,
                }))}
                value={form.category_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category_id: e.target.value }))
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberInputField
                  label="Measure Value"
                  id="measure-value"
                  min={0}
                  placeholder="e.g. 50"
                  value={form.measure_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, measure_value: e.target.value }))
                  }
                />
                <SelectInputField
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
                {/* Shipping weight. The column existed with no way to set it,
                    so every product read as weightless to delivery pricing. */}
                <NumberInputField
                  label="Weight (grams)"
                  id="weight-grams"
                  min={0}
                  placeholder="e.g. 25000 for a 25kg bag"
                  value={form.weight_grams}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weight_grams: e.target.value }))
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
                  <div className="border-line relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
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
                  <div className="border-line bg-light-bg flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed">
                    <Package size={28} className="text-body opacity-20" />
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
                    className="border-line text-heading flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
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
                  <p className="text-body text-xs">
                    JPG, PNG or WebP: max 5 MB
                  </p>
                </div>
              </div>

              {/* Bundled photo gallery */}
              <div className="flex flex-col gap-2">
                <p className="text-body text-xs font-medium">
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
                            : "border-line hover:border-primary/50"
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
              <TextInputField
                label="Image URL"
                id="image-url"
                placeholder="https://... or /images/products/rice-bowl.jpg"
                value={form.image_url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, image_url: e.target.value }))
                }
              />
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
                className="border-line text-body rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products table */}
      <DataTable
        rows={products}
        columns={columns}
        actions={rowActions}
        caption="Products"
        showSearch
        searchPlaceholder="Search products by name, unit or category"
        loading={loading}
        error={loadError}
        onRetry={() => void load()}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyState={
          <TableEmptyState
            icon={Package}
            title="No products yet"
            description={'Click "Add Product" to get started.'}
          />
        }
      />
    </div>
  );
}
