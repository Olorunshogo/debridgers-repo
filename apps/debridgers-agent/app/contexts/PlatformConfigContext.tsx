import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { apiFetch } from "@debridgers/api-client";
import type { PricingRules } from "@debridgers/pricing";

/*
 * Platform settings the admin controls, fetched once and shared.
 * These live in `system_settings` and are served by GET /config/public, which needs no auth because the agent recruitment page reads the commission rate before anyone signs in.
 * Before this existed, `marketing/agents.tsx` fetched the endpoint itself and fell back to a hardcoded rate, so a slow or failed request rendered an entire earnings table at the wrong figure on the one page whose job is telling agents what they will earn.
 */

// === Types

/*
 * Kobo, exactly as the API serves it, converted once below.
 * The default_tier_one/default_tier_two/default_delivery_cap fields are per-zone defaults; a quote for a specific delivery must read them off that zone rather than from here.
 */
interface PublicPricingResponse {
  service_fee_rate: number;
  service_fee_min_kobo: number;
  service_fee_max_kobo: number;
  packages_included_in_base: number;
  tier_one_package_count: number;
  default_tier_one_per_package_kobo: number;
  default_tier_two_per_package_kobo: number;
  default_delivery_cap_over_base_kobo: number;
  minimum_order_kobo: number;
  minimum_order_packages: number;
}

/*
 * The running free-delivery campaign, or null when none is.
 * Served publicly so the shop and the zone picker can announce it before anyone signs in.
 * `zone_ids` is served rather than derived: a zone-scoped campaign covers one zone, a global or first-order one covers every active zone, and re-deriving that rule on the client is how the two ends drift apart.
 * `ends_at` is an ISO string over the wire; the API types it as a Date server-side.
 */
export type DeliveryPromotionScope = "global" | "zone" | "first_order";

export interface DeliveryPromotion {
  name: string;
  scope: DeliveryPromotionScope;
  ends_at: string;
  zone_ids: number[];
}

interface PublicConfigResponse {
  agent_commission_rate: number;
  buyer_referral_discount_kobo: number;
  buyer_referral_discount_type: string;
  currency: string;
  delivery_promotion?: DeliveryPromotion | null;
  pricing?: PublicPricingResponse;
}

/*
 * One conversion, in one place.
 * Every consumer downstream works in naira and never has to ask which unit it is holding, which is the mistake that has already produced a 100x transfer bug and a 100x refund bug in this codebase.
 */
function toPricingRules(p: PublicPricingResponse): PricingRules {
  const naira = (kobo: number): number => kobo / 100;

  return {
    serviceFeeRate: p.service_fee_rate,
    serviceFeeMin: naira(p.service_fee_min_kobo),
    serviceFeeMax: naira(p.service_fee_max_kobo),
    packagesInBase: p.packages_included_in_base,
    tierOnePackages: p.tier_one_package_count,
    tierOnePerPackage: naira(p.default_tier_one_per_package_kobo),
    tierTwoPerPackage: naira(p.default_tier_two_per_package_kobo),
    deliveryCapOverBase: naira(p.default_delivery_cap_over_base_kobo),
    minimumOrder: naira(p.minimum_order_kobo),
    minimumOrderPackages: p.minimum_order_packages,
  };
}

/*
 * `commissionPercent` and `commissionRate`: the API serves a PERCENTAGE (5), not a fraction (0.05).
 * Both are exposed deliberately: the same ambiguity already caused a real bug server-side, where a stored percentage would have been multiplied as-is rather than divided down first.
 * `pricing` is null until the first response lands, and null if it failed, deliberately not defaulted: a pricing calculator that silently quotes against invented fee rules is worse than one that refuses to render.
 * `deliveryPromotion` is null both when no campaign is running and before the first response lands, so gate on `isLoading` before concluding there is no promotion.
 * `isLoading` is true until the first fetch settles, so callers can hold off on rendering a number rather than flashing a placeholder that is wrong.
 * `error` is set when the fetch failed and the values above are defaults, not live.
 */
interface PlatformConfigContextType {
  commissionPercent: number;
  commissionRate: number;
  referralDiscountKobo: number;
  referralDiscountType: string;
  currency: string;
  pricing: PricingRules | null;
  deliveryPromotion: DeliveryPromotion | null;
  isLoading: boolean;
  error: string | null;
}

/*
 * Used only until the first response lands, and only so the shape is never undefined.
 * Anything user-facing should gate on `isLoading` instead of rendering these.
 */
const FALLBACK = {
  agent_commission_rate: 0,
  buyer_referral_discount_kobo: 0,
  buyer_referral_discount_type: "flat",
  currency: "NGN",
} as const;

const PlatformConfigContext = createContext<PlatformConfigContextType | null>(
  null,
);

export function PlatformConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfigResponse>(FALLBACK);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<PublicConfigResponse>("/config/public")
      .then((data) => {
        if (cancelled) return;
        setConfig(data);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        /*
         * Deliberately not silent.
         * A wrong commission rate shown to an agent is a promise about their income, so callers are told the number is not live rather than being handed a plausible-looking default.
         */
        setError("Could not load platform settings.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlatformConfigContext.Provider
      value={{
        commissionPercent: config.agent_commission_rate,
        commissionRate: config.agent_commission_rate / 100,
        referralDiscountKobo: config.buyer_referral_discount_kobo,
        referralDiscountType: config.buyer_referral_discount_type,
        currency: config.currency,
        pricing: config.pricing ? toPricingRules(config.pricing) : null,
        deliveryPromotion: config.delivery_promotion ?? null,
        isLoading,
        error,
      }}
    >
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig(): PlatformConfigContextType {
  const ctx = useContext(PlatformConfigContext);
  if (!ctx) {
    throw new Error(
      "usePlatformConfig must be used inside <PlatformConfigProvider>",
    );
  }
  return ctx;
}
