import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { apiFetch } from "@debridgers/api-client";

/*
 * Platform settings the admin controls, fetched once and shared.
 *
 * These live in `system_settings` and are served by GET /config/public, which
 * needs no auth because the agent recruitment page reads the commission rate
 * before anyone signs in.
 *
 * Before this existed, `landing/agents.tsx` fetched the endpoint itself and fell
 * back to a hardcoded rate, so a slow or failed request rendered an entire
 * earnings table at the wrong figure on the one page whose job is telling
 * agents what they will earn.
 */

// === Types

interface PublicConfigResponse {
  agent_commission_rate: number;
  buyer_referral_discount_kobo: number;
  buyer_referral_discount_type: string;
  currency: string;
}

interface PlatformConfigContextType {
  /*
   * The API serves a PERCENTAGE (5), not a fraction (0.05). Both are exposed
   * deliberately: the same ambiguity already caused a real bug server-side,
   * where a stored percentage would have been multiplied as-is rather than
   * divided down first. No call site should have to remember which form it
   * received.
   */
  commissionPercent: number;
  commissionRate: number;
  referralDiscountKobo: number;
  referralDiscountType: string;
  currency: string;
  /* True until the first fetch settles, so callers can hold off on rendering
     a number rather than flashing a placeholder that is wrong. */
  isLoading: boolean;
  /* Set when the fetch failed and the values below are defaults, not live. */
  error: string | null;
}

/*
 * Used only until the first response lands, and only so the shape is never
 * undefined. Anything user-facing should gate on `isLoading` instead of
 * rendering these.
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
         * Deliberately not silent. A wrong commission rate shown to an agent is
         * a promise about their income, so callers are told the number is not
         * live rather than being handed a plausible-looking default.
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
