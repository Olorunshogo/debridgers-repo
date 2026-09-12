import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  formatFromKobo,
  useDialog,
  fadeUpVariants,
  transitionBase,
} from "@debridgers/ui-web";

const PAYOUT_DAY_OF_WEEK = 5;

function getNextPayoutDate(): string {
  const today = new Date();
  const daysUntil = (PAYOUT_DAY_OF_WEEK - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export interface WalletSummaryCardProps {
  availableBalanceKobo: number;
  pendingBalanceKobo: number;
  totalEarnedKobo: number;
  bankReady: boolean;
  onPayoutRequested: () => void;
}

export function WalletSummaryCard({
  availableBalanceKobo,
  pendingBalanceKobo,
  totalEarnedKobo,
  bankReady,
  onPayoutRequested,
}: WalletSummaryCardProps) {
  const { triggerDialog } = useDialog();
  const nextPayoutDate = getNextPayoutDate();

  return (
    <motion.div
      variants={fadeUpVariants}
      initial="initial"
      animate="animate"
      transition={transitionBase}
      className="bg-primary flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-white/70">Available Balance</p>
        <p className="font-syne text-4xl font-extrabold text-white">
          {formatFromKobo(availableBalanceKobo)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-secondary flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
            <Wallet size={14} />
            {formatFromKobo(pendingBalanceKobo)} pending
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
            <TrendingUp size={14} />
            {formatFromKobo(totalEarnedKobo)} earned all-time
          </div>

          <button
            type="button"
            onClick={() =>
              triggerDialog("REQUEST_PAYOUT", {
                availableBalanceKobo,
                onRequested: onPayoutRequested,
              })
            }
            disabled={availableBalanceKobo <= 0 || !bankReady}
            title={
              bankReady
                ? undefined
                : "Add your bank details below before requesting a payout"
            }
            className="text-primary flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpRight size={14} /> Request payout
          </button>
        </div>

        {!bankReady && availableBalanceKobo > 0 && (
          <p className="text-xs text-white/70">
            Add your bank details below to enable payouts.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <p className="text-xs text-white/60">Automatic payout at</p>
        <p className="text-secondary font-syne text-xl font-bold">
          {nextPayoutDate}
        </p>
        <p className="text-xs text-white/60">Every Friday 9am disbursement</p>
      </div>
    </motion.div>
  );
}

WalletSummaryCard.displayName = "WalletSummaryCard";
