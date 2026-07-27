import type { SelectOption } from "../types/location";

/*
 * Merchandising categories for the product catalogue.
 *
 * Held here rather than derived from whatever happens to be in the database, so
 * the admin form and the shop filter offer the same fixed set and a typo cannot
 * fragment the filter into "Beans" and "beans".
 *
 * Adding one is a change here plus an admin edit - no migration, because
 * products.category is plain text.
 */
export const productCategories = [
  "Rice",
  "Beans",
  "Garri",
  "Oil",
  "Tubers",
] as const;

export type ProductCategory = (typeof productCategories)[number];

export function productCategoryOptions(): SelectOption[] {
  return productCategories.map((category) => ({
    value: category,
    label: category,
  }));
}

/** Chip list for the shop filter, with the "show everything" entry first. */
export const ALL_CATEGORIES = "All";

export function categoryFilterChips(
  present: readonly (string | null)[],
): string[] {
  /*
   * Only offer a category that actually has products behind it - an empty
   * filter chip is worse than no chip.
   */
  const available = productCategories.filter((c) => present.includes(c));
  return [ALL_CATEGORIES, ...available];
}
