import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@debridgers/api-client";
import { BankDetailsCard } from "@/components/agent/BankDetailsCard";
import {
  WalletSummaryCard,
  CommissionsTable,
  WithdrawalsTable,
  mapCommission,
  mapWithdrawal,
  type ApiWallet,
  type ApiCommission,
  type ApiWithdrawal,
  type CommissionRow,
  type WithdrawalRow,
} from "@/components/agent/wallet";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Weekly Payout | Debridgers",
    description:
      "View your weekly commission payouts and earnings history as a Debridgers field agent.",
    path: "/wallet",
    noIndex: true,
  });
}

export default function AgentWalletPage() {
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /* Payouts are rejected server-side without bank details, so the button is disabled rather than letting the agent hit a guaranteed error. */
  const [bankReady, setBankReady] = useState<boolean>(false);

  /* Extracted so the payout dialog can refresh the balance after requesting. */
  const load = useCallback(async (): Promise<void> => {
    try {
      const [w, cs, ws] = await Promise.all([
        apiFetch<ApiWallet>("/agent/wallet"),
        apiFetch<ApiCommission[]>("/agent/commissions"),
        apiFetch<ApiWithdrawal[]>("/agent/withdrawals"),
      ]);
      setWallet(w);
      setCommissions(cs.map(mapCommission));
      setWithdrawals(ws.map(mapWithdrawal));
    } catch {
      /* Leave the last known values on screen rather than blanking the page. */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <WalletSummaryCard
        availableBalanceKobo={wallet?.available_balance ?? 0}
        pendingBalanceKobo={wallet?.pending_balance ?? 0}
        totalEarnedKobo={wallet?.total_earned ?? 0}
        bankReady={bankReady}
        onPayoutRequested={() => void load()}
      />

      <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">
          Commission History
        </h3>
        <CommissionsTable rows={commissions} loading={loading} />
      </div>

      <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">Payout History</h3>
        <WithdrawalsTable rows={withdrawals} loading={loading} />
      </div>

      <BankDetailsCard
        onDetailsChange={(details) => setBankReady(details.is_complete)}
      />
    </div>
  );
}
