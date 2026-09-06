import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Package, ChevronDown } from "lucide-react";
import {
  formatFromKobo,
  collapseVariants,
  transitionBase,
} from "@debridgers/ui-web";

/*
 * Category > Type > Variety drill-down for the agent stock request.
 *
 * Walks the taxonomy to whatever depth each branch actually has rather than
 * assuming three levels, because the catalogue is not uniform: Grains reaches
 * Grains > Rice > Ofada, while Oil stops at Oil > Palm Oil. A fixed three-step
 * wizard would need an invented middle step for every shallow branch.
 *
 * This replaces grouping products by their `description` text, which put the
 * blurb to work as a category and produced one bucket per product.
 */

// === Types

export interface TaxonomyNode {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image_url: string | null;
  children: TaxonomyNode[];
}

export interface PickerProduct {
  id: number;
  name: string;
  unit: string;
  price_kobo: number;
  description: string | null;
  image_url: string | null;
  category_id: number | null;
}

export interface StockTaxonomyPickerProps {
  tree: TaxonomyNode[];
  products: PickerProduct[];
  /** Product ids already in the request, shown with a tick. */
  addedProductIds: readonly number[];
  onAdd: (product: PickerProduct, quantity: number) => void;
}

export function StockTaxonomyPicker({
  tree,
  products,
  addedProductIds,
  onAdd,
}: StockTaxonomyPickerProps) {
  /* Ids from root downwards. Length is the current drill depth. */
  const [path, setPath] = useState<number[]>([]);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  /*
   * Every descendant id of a node, so selecting "Rice" can show products
   * attached at any depth beneath it. Without this, a product filed directly on
   * a type rather than a variety would be invisible.
   */
  const descendantsById = useMemo<Map<number, number[]>>(() => {
    const map = new Map<number, number[]>();
    const collect = (node: TaxonomyNode): number[] => {
      const ids = [node.id];
      for (const child of node.children) ids.push(...collect(child));
      map.set(node.id, ids);
      return ids;
    };
    for (const root of tree) collect(root);
    return map;
  }, [tree]);

  const nodesById = useMemo<Map<number, TaxonomyNode>>(() => {
    const map = new Map<number, TaxonomyNode>();
    const walk = (node: TaxonomyNode): void => {
      map.set(node.id, node);
      for (const child of node.children) walk(child);
    };
    for (const root of tree) walk(root);
    return map;
  }, [tree]);

  /* Products with no taxonomy yet, so an unmigrated product is still orderable. */
  const untaxonomised = useMemo<PickerProduct[]>(
    () => products.filter((p) => p.category_id === null),
    [products],
  );

  function productsFor(nodeId: number): PickerProduct[] {
    const ids = descendantsById.get(nodeId) ?? [nodeId];
    const idSet = new Set(ids);
    return products.filter(
      (p) => p.category_id !== null && idSet.has(p.category_id),
    );
  }

  function hasAnythingBelow(node: TaxonomyNode): boolean {
    return node.children.length > 0 || productsFor(node.id).length > 0;
  }

  /* Selecting at a level truncates everything below it. */
  function select(level: number, nodeId: number): void {
    setActiveProductId(null);
    setQuantity(1);
    setPath((prev) => {
      const next = prev.slice(0, level);
      if (prev[level] === nodeId) return next;
      return [...next, nodeId];
    });
  }

  function toggleProduct(id: number): void {
    setActiveProductId((prev) => (prev === id ? null : id));
    setQuantity(1);
  }

  function handleAdd(product: PickerProduct): void {
    onAdd(product, quantity);
    setActiveProductId(null);
    setQuantity(1);
  }

  // === Level rendering

  /*
   * The rows to render: roots, then the children of each selected node, stopping
   * when a selected node has no children of its own.
   */
  const levels: { nodes: TaxonomyNode[]; selectedId: number | null }[] = [];
  let currentNodes: TaxonomyNode[] = tree.filter(hasAnythingBelow);
  for (let level = 0; currentNodes.length > 0; level += 1) {
    const selectedId = path[level] ?? null;
    levels.push({ nodes: currentNodes, selectedId });
    if (selectedId === null) break;
    const selected = nodesById.get(selectedId);
    if (!selected) break;
    currentNodes = selected.children.filter(hasAnythingBelow);
  }

  const deepestSelectedId = path[path.length - 1] ?? null;
  const deepestSelected = deepestSelectedId
    ? nodesById.get(deepestSelectedId)
    : null;

  /*
   * What to show under the current selection.
   *
   * When there is nothing further to drill into, show everything beneath the
   * node. When there IS, show only products attached directly to it: a product
   * filed on "Beans" rather than on a specific variety (because its name named
   * two of them) would otherwise be unreachable, visible at no level of the
   * drill-down while its siblings sat one level down.
   */
  const drillableChildren = deepestSelected
    ? deepestSelected.children.filter(hasAnythingBelow)
    : [];

  const visibleProducts: PickerProduct[] = deepestSelected
    ? drillableChildren.length === 0
      ? productsFor(deepestSelected.id)
      : products.filter((p) => p.category_id === deepestSelected.id)
    : untaxonomised;

  const stepLabels = ["Select category", "Select type", "Select variety"];

  return (
    <div className="flex flex-col gap-4">
      {levels.map((level, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className="text-heading text-xs font-semibold tracking-wider uppercase opacity-60">
            Step {i + 1} - {stepLabels[i] ?? "Narrow down"}
          </p>
          {/*
            Horizontal scroll rather than wrapping on mobile: a category row that
            wraps to three lines pushes the actual products off-screen.
          */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {level.nodes.map((node) => {
              const isActive = level.selectedId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => select(i, node.id)}
                  className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-line text-heading hover:border-primary bg-white"
                  }`}
                >
                  {node.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <AnimatePresence mode="wait">
        {visibleProducts.length > 0 && (
          <motion.div
            key={deepestSelectedId ?? "untaxonomised"}
            variants={collapseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              <p className="text-heading text-xs font-semibold tracking-wider uppercase opacity-60">
                Step {levels.length + 1} - Pick a product
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleProducts.map((product) => {
                  const isActive = activeProductId === product.id;
                  const added = addedProductIds.includes(product.id);
                  return (
                    <div key={product.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                          isActive
                            ? "border-primary bg-dash-quick-action-hover rounded-b-none"
                            : added
                              ? "border-primary/30 bg-green-50"
                              : "border-line bg-light-bg"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center">
                                <Package
                                  size={18}
                                  className="text-body opacity-25"
                                />
                              </span>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-heading truncate text-sm font-semibold">
                              {product.name}
                            </span>
                            <span className="text-body text-xs">
                              {product.unit} -{" "}
                              {formatFromKobo(product.price_kobo)} to remit
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {added && (
                            <span className="text-primary text-xs font-semibold">
                              Added
                            </span>
                          )}
                          <ChevronDown
                            size={14}
                            className={`text-body transition-transform ${isActive ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            variants={collapseVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={transitionBase}
                            className="overflow-hidden"
                          >
                            <div className="border-line bg-light-bg flex flex-wrap items-center gap-3 rounded-b-xl border border-t-0 px-4 py-3">
                              <div className="border-line flex items-center gap-1 rounded-full border bg-white">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() =>
                                    setQuantity((q) => Math.max(1, q - 1))
                                  }
                                  className="cursor-pointer rounded-full p-2 hover:bg-black/5"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-syne text-heading w-8 text-center text-sm font-bold">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() => setQuantity((q) => q + 1)}
                                  className="cursor-pointer rounded-full p-2 hover:bg-black/5"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAdd(product)}
                                className="bg-primary flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none"
                              >
                                Add to request
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {deepestSelected &&
        drillableChildren.length === 0 &&
        visibleProducts.length === 0 && (
          <p className="text-body py-4 text-center text-sm">
            No products stocked under {deepestSelected.name} yet.
          </p>
        )}
    </div>
  );
}

StockTaxonomyPicker.displayName = "StockTaxonomyPicker";
