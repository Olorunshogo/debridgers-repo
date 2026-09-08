import type { SelectOption } from "@debridgers/ui-web";

// === Unsold Reasons

/* Agent-only: the daily report's "why didn't this sell" options.
Not shared geography data, so it stays local rather than living in the shared Nigerian-states dataset. */
export const unsoldReasons: SelectOption[] = [
  { value: "no_customers", label: "No customers today" },
  { value: "price_too_high", label: "Price too high" },
  { value: "product_quality", label: "Product quality issue" },
  { value: "bad_weather", label: "Bad weather / flooding" },
  { value: "market_closed", label: "Market was closed" },
  { value: "personal_emergency", label: "Personal emergency" },
  { value: "stock_damaged", label: "Stock was damaged" },
  { value: "other", label: "Other" },
];
