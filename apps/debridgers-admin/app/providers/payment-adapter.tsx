import { useMemo, type ReactNode } from "react";
import {
  PaymentAdapterProvider,
  type PaymentAdapter,
} from "@debridgers/ui-web";
import { apiFetch } from "@debridgers/api-client";

/*
 * Wires the shared payment hooks in @debridgers/ui-web to this app's transport,
 * the same seam AppAuthAdapterProvider gives the auth hooks.
 *
 * Endpoints arrive as arguments rather than being hardcoded here: each role's
 * RolePaymentConfig owns its paths, which is what lets buyer and agent share
 * one set of hooks.
 */
export function AppPaymentAdapterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapter = useMemo<PaymentAdapter>(
    () => ({
      getWallet: (endpoint, page, limit) =>
        apiFetch<unknown>(`${endpoint}?page=${page}&limit=${limit}`),

      initiateDeposit: (endpoint, amountKobo) =>
        apiFetch<unknown>(endpoint, {
          method: "POST",
          body: JSON.stringify({ amount_kobo: amountKobo }),
        }),

      confirmDeposit: (endpoint, reference) =>
        apiFetch<unknown>(endpoint, {
          method: "POST",
          body: JSON.stringify({ reference }),
        }),

      submitWithdrawal: (endpoint, amountKobo, reason) =>
        apiFetch<unknown>(endpoint, {
          method: "POST",
          body: JSON.stringify({ amount_kobo: amountKobo, reason }),
        }),

      getBanks: (endpoint) => apiFetch<unknown>(endpoint),

      getPayoutAccount: (endpoint) => apiFetch<unknown>(endpoint),

      setPayoutAccount: (endpoint, bankCode, accountNumber) =>
        apiFetch<unknown>(endpoint, {
          method: "POST",
          body: JSON.stringify({
            bank_code: bankCode,
            account_number: accountNumber,
          }),
        }),
    }),
    [],
  );

  return (
    <PaymentAdapterProvider adapter={adapter}>
      {children}
    </PaymentAdapterProvider>
  );
}
