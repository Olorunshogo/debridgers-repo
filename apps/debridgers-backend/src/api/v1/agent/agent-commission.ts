/*
 * Agent commission, and the remit price that follows from it.
 *
 * Commission is a flat naira amount per package, never a percentage of order
 * value. Two reasons, and both are load-bearing.
 *
 * Affordability: 5% of a ₦42,000 bag of rice is ₦2,100 against a gross margin
 * of roughly ₦2,520. A percentage of order value pays out 83% of the margin and
 * leaves nothing for delivery, payments, or the company.
 *
 * Legibility: an agent can verify "₦1,000 a bag" by counting bags. A percentage
 * of margin is correct economically but unverifiable, and pay an agent cannot
 * check is pay an agent stops trusting.
 *
 * Keeping commission in naira also makes it structurally impossible to confuse
 * with the remittance rate, which is a percentage. That confusion is what put
 * an "agent remittance rate: 5%" line into three company documents.
 *
 * Sanity rule: commission stays between 30% and 45% of gross margin. At the
 * assumed 6% procurement spread these bands sit at 36%, 40% and 42%. If the
 * measured spread comes in nearer 3%, they consume 79% of margin and the LEVEL
 * must drop. The basis does not change; the level is provisional until the
 * supplier register produces a real landed cost.
 *
 * Full derivation in docs/business/BusinessModel.md, Decision 4.
 */

/** Commission per package for the beans band, in kobo. */
export const COMMISSION_BEANS_KOBO = 120_000;

/** Commission per package for the rice band, in kobo. */
export const COMMISSION_RICE_KOBO = 100_000;

/** Commission per package for the oil band, in kobo. */
export const COMMISSION_OIL_KOBO = 70_000;

/** Commission per package for everything outside the hero products, in kobo. */
export const COMMISSION_DEFAULT_KOBO = 40_000;

/*
 * Hero products are a short, deliberately locked list, so an explicit map is
 * more truthful than inferring a band from the unit string - Irish Potato ships
 * in the same bag as beans and is not a hero product.
 *
 * This belongs on the products table as an `agent_commission_kobo` column once
 * the catalogue outgrows a list you can read in one screen. Until then a map
 * that is obviously wrong when it is wrong beats a heuristic that is quietly
 * wrong.
 */
const COMMISSION_BY_PRODUCT_NAME: Record<string, number> = {
  "Wake Gida (Honey Beans)": COMMISSION_BEANS_KOBO,
  "Cowpea (White Beans)": COMMISSION_BEANS_KOBO,
  "Local White Rice": COMMISSION_RICE_KOBO,
  "Tuwo Rice": COMMISSION_RICE_KOBO,
  "Ofada Rice": COMMISSION_RICE_KOBO,
  "Palm Oil": COMMISSION_OIL_KOBO,
  "Groundnut Oil": COMMISSION_OIL_KOBO,
};

/** Commission earned on one package of a product, in kobo. */
export function commissionPerPackageKobo(productName: string): number {
  return COMMISSION_BY_PRODUCT_NAME[productName] ?? COMMISSION_DEFAULT_KOBO;
}

/**
 * What an agent owes per package taken on consignment: the price the buyer pays, less the agent's commission on that package.
 *
 * Floored at zero so a commission band misconfigured above a product's price can never record a negative debt, which would read as the company owing the agent for taking stock.
 */
export function remitPerPackageKobo(
  productName: string,
  priceKobo: number,
): number {
  return Math.max(0, priceKobo - commissionPerPackageKobo(productName));
}

// === Consignment exposure

/*
 * A consignment package is ₦27,000 to ₦54,000 of company stock in someone
 * else's hands. Five bags of beans with one agent is 90% of the company's cash.
 * These limits exist so that is refused rather than monitored.
 *
 * New agents start order-first - the agent takes a paid order, then stock is
 * released, then they deliver - which carries no exposure at all. Consignment
 * is earned after eight weeks above 95% remittance, not granted on approval.
 */

/** Ceiling on one agent's outstanding stock in their first 8 weeks, in kobo. */
export const AGENT_EXPOSURE_NEW_KOBO = 5_000_000;

/** Ceiling once an agent has 8 weeks above 95% remittance, in kobo. */
export const AGENT_EXPOSURE_ESTABLISHED_KOBO = 15_000_000;

/** Share of cash on hand that may sit in consignment across all agents. */
export const TOTAL_EXPOSURE_SHARE_OF_CASH = 0.3;

/** Days after which unremitted stock is chased rather than waited on. */
export const MAX_DAYS_OUTSTANDING = 7;
