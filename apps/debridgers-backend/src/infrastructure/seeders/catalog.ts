/*
 * The catalogue: one definition of the product taxonomy, the products, and
 * which leaf each product hangs from.
 *
 * Both seeders import this. They used to carry separate copies - the dev seeder
 * owned the taxonomy and the production seeder owned the products - which is
 * how production ended up with eleven products, no categories at all, and an
 * empty category tree.
 *
 * The tree is deliberately uneven. Oil reaches its leaves in two levels while
 * Grains and Processed take three, and product_categories.parent_id supports
 * that rather than forcing an invented middle row.
 */

// ₦ → kobo
const naira = (n: number): number => n * 100;

export interface TaxonomyNodeSeed {
  name: string;
  children?: TaxonomyNodeSeed[];
}

export interface ProductSeed {
  name: string;
  unit: string;
  price_kobo: number;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

// === Taxonomy

export const TAXONOMY: TaxonomyNodeSeed[] = [
  {
    name: "Grains",
    children: [
      {
        name: "Rice",
        children: [
          { name: "Local White" },
          { name: "Ofada" },
          { name: "Tuwo" },
          { name: "Long Grain" },
        ],
      },
      {
        name: "Maize",
        children: [{ name: "White Maize" }, { name: "Yellow Maize" }],
      },
      { name: "Millet" },
    ],
  },
  {
    // Beans is a root, not a child of Grains: legumes are not cereals, and while it sat under Grains a bag of Wake Gida filtered as a grain.
    name: "Beans",
    children: [
      { name: "Wake Gida" },
      { name: "Cowpea" },
      { name: "Soya Beans" },
      { name: "Ameria" },
      { name: "Honey Beans" },
    ],
  },
  {
    name: "Roots and Tubers",
    children: [{ name: "Yam" }, { name: "Irish Potato" }],
  },
  { name: "Oil", children: [{ name: "Palm Oil" }, { name: "Groundnut Oil" }] },
  {
    // Garri is milled cassava, botanically under roots and tubers, but sits under Processed because that's how a buyer looks for it, not by the tuber it came from.
    name: "Processed",
    children: [
      {
        name: "Garri",
        children: [{ name: "White" }, { name: "Yellow" }, { name: "Ijebu" }],
      },
    ],
  },
];

// === Products

/*
 * image_url points at the photos bundled under the frontend's
 * public/images/products, which the product DTO accepts as an app-relative
 * path alongside a Cloudinary URL.
 *
 * Both garri products are deliberately left null. The only unused bundled
 * photos are of whole maize cobs, and garri is milled cassava, so nothing here
 * depicts it. A wrong photo on a food product is worse than the placeholder
 * the card falls back to, so they stay empty until real photos exist.
 *
 * cowpea.jpg is a copy of sweet-beans.jpg rather than a reference to it, so
 * dropping in a true cowpea photo later does not change Wake Gida's image.
 */
export const PRODUCTS: ProductSeed[] = [
  {
    name: "Local White Rice",
    unit: "50kg bag",
    price_kobo: naira(42000),
    description: "Fresh locally sourced white rice. Sold per 50kg bag.",
    image_url: "/images/products/rice-white.jpg",
    is_active: true,
    sort_order: 1,
  },
  {
    name: "Ofada Rice",
    unit: "50kg bag",
    price_kobo: naira(48000),
    description: "Premium Nigerian Ofada rice. Sold per 50kg bag.",
    image_url: "/images/products/rice-grains.jpg",
    is_active: true,
    sort_order: 2,
  },
  {
    name: "Tuwo Rice",
    unit: "50kg bag",
    price_kobo: naira(38000),
    description: "Soft tuwo rice, ideal for tuwo shinkafa. Sold per 50kg bag.",
    image_url: "/images/products/rice-bowl.jpg",
    is_active: true,
    sort_order: 3,
  },
  {
    name: "Wake Gida (Honey Beans)",
    unit: "100kg bag",
    price_kobo: naira(55000),
    description:
      "Northern Nigerian honey beans, brown and sweet. Sold per 100kg bag.",
    image_url: "/images/products/sweet-beans.jpg",
    is_active: true,
    sort_order: 4,
  },
  {
    name: "Cowpea (White Beans)",
    unit: "100kg bag",
    price_kobo: naira(52000),
    description: "White cowpea beans, clean and fresh. Sold per 100kg bag.",
    image_url: "/images/products/cowpea.jpg",
    is_active: true,
    sort_order: 5,
  },
  {
    name: "White Garri",
    unit: "100kg bag",
    price_kobo: naira(12000),
    description: "Freshly processed white garri. Sold per 100kg bag.",
    image_url: null,
    is_active: true,
    sort_order: 6,
  },
  {
    name: "Yellow Garri (Toasted)",
    unit: "100kg bag",
    price_kobo: naira(14000),
    description: "Toasted yellow garri with rich flavour. Sold per 100kg bag.",
    image_url: null,
    is_active: true,
    sort_order: 7,
  },
  {
    name: "Palm Oil",
    unit: "25 litre keg",
    price_kobo: naira(28000),
    description: "Fresh red palm oil from Northern Nigeria. Sold per 25L keg.",
    image_url: "/images/products/pouring-oil.jpg",
    is_active: true,
    sort_order: 8,
  },
  {
    name: "Groundnut Oil",
    unit: "25 litre keg",
    price_kobo: naira(35000),
    description: "Pure groundnut oil, cold pressed. Sold per 25L keg.",
    image_url: "/images/products/pouring-oil.jpg",
    is_active: true,
    sort_order: 9,
  },
  {
    name: "Yam",
    unit: "100 tubers",
    price_kobo: naira(30000),
    description:
      "Fresh medium-sized yam tubers from the farm. Sold per 100 tubers.",
    image_url: "/images/products/yams.jpg",
    is_active: true,
    sort_order: 10,
  },
  {
    name: "Millet",
    unit: "100kg bag",
    /*
     * Purchased and resold since before it was listed, which meant it could not be ordered, costed or reported on.
     * `!todo()` confirm the retail price against a real invoice - this is the last figure paid, not a set price.
     */
    price_kobo: naira(40000),
    description: "Locally sourced millet grain. Sold per 100kg bag.",
    image_url: null,
    is_active: true,
    sort_order: 12,
  },
  {
    name: "Irish Potato",
    unit: "100kg bag",
    price_kobo: naira(18000),
    description: "Fresh Irish potatoes, uniform size. Sold per 100kg bag.",
    image_url: "/images/products/potatoes.jpg",
    is_active: true,
    sort_order: 11,
  },
];

// === Product placement

/*
 * Product name → the leaf it hangs from, as a " > " path through TAXONOMY.
 *
 * The Maize branch has no products yet: the varieties exist so stock and
 * filtering have somewhere to attach, but nothing is listed for sale until real
 * prices and units are set. Inventing them here would put made-up figures in
 * front of buyers.
 */
export const PRODUCT_LEAF_PATHS: Record<string, string> = {
  "Local White Rice": "Grains > Rice > Local White",
  "Ofada Rice": "Grains > Rice > Ofada",
  "Tuwo Rice": "Grains > Rice > Tuwo",
  "Wake Gida (Honey Beans)": "Beans > Wake Gida",
  "Cowpea (White Beans)": "Beans > Cowpea",
  "White Garri": "Processed > Garri > White",
  "Yellow Garri (Toasted)": "Processed > Garri > Yellow",
  "Palm Oil": "Oil > Palm Oil",
  "Groundnut Oil": "Oil > Groundnut Oil",
  Yam: "Roots and Tubers > Yam",
  Millet: "Grains > Millet",
  "Irish Potato": "Roots and Tubers > Irish Potato",
};
