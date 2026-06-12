import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Weekly Payout | Debridgers" },
    {
      name: "description",
      content:
        "View your weekly commission payouts and earnings history as a Debridgers field agent.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

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

function fmt(kobo: number) {
  return (
    "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })
  );
}

interface ApiWallet {
  available_balance: number;
  pending_balance: number;
}

interface ApiCommission {
  id: number;
  type: string;
  amount: string;
  status: string;
  created_at: string;
}

interface CommissionRow {
  id: string;
  description: string;
  amount: number;
  status: string;
  date: string;
  isPaid: boolean;
}

function mapCommission(c: ApiCommission): CommissionRow {
  const typeLabel: Record<string, string> = {
    buyer_referral: "Buyer referral commission",
    sales_report: "Sales report commission",
    stock_sale: "Stock sale commission",
  };
  return {
    id: String(c.id),
    description: typeLabel[c.type] ?? c.type,
    amount: Math.round(parseFloat(c.amount) * 100),
    status: c.status,
    date: new Date(c.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    isPaid: c.status === "paid",
  };
}

const STATUS_BADGE: Record<
  string,
  { bgClass: string; textClass: string; label: string }
> = {
  pending: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    label: "Pending",
  },
  paid: {
    bgClass: "bg-status-active-bg",
    textClass: "text-status-active-text",
    label: "Paid",
  },
};

export default function AgentWalletPage() {
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const nextPayoutDate = getNextPayoutDate();

  useEffect(() => {
    Promise.all([
      apiFetch<ApiWallet>("/agent/wallet"),
      apiFetch<ApiCommission[]>("/agent/commissions"),
    ])
      .then(([w, cs]) => {
        setWallet(w);
        setCommissions(cs.map(mapCommission));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="bg-gray-border h-40 rounded-2xl" />
        <div className="bg-gray-border h-64 rounded-2xl" />
      </div>
    );
  }

  const availableBalance = wallet?.available_balance ?? 0;
  const pendingBalance = wallet?.pending_balance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-primary flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70">Available Balance</p>
          <p className="font-syne text-4xl font-extrabold text-white">
            {fmt(availableBalance)}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="text-secondary flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
              <Wallet size={14} />
              {fmt(pendingBalance)} pending
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <p className="text-xs text-white/60">Automatic payout at</p>
          <p className="text-secondary font-syne text-xl font-bold">
            {nextPayoutDate}
          </p>
          <p className="text-xs text-white/60">Every Friday 9am disbursement</p>
        </div>
      </motion.div>

      {/* Commission history */}
      <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">
          Commission History
        </h3>

        {commissions.length === 0 ? (
          <p className="text-text py-8 text-center text-sm">
            No commissions yet. Sell stock or refer buyers to earn commission.
          </p>
        ) : (
          <div className="flex flex-col">
            {commissions.map((c, i) => {
              const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.pending;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-gray-border flex items-center justify-between border-b py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        c.isPaid
                          ? "bg-status-delivered-bg"
                          : "bg-status-pending-bg"
                      }`}
                    >
                      {c.isPaid ? (
                        <ArrowDownLeft
                          size={16}
                          className="text-status-delivered-text"
                        />
                      ) : (
                        <ArrowUpRight
                          size={16}
                          className="text-status-pending-text"
                        />
                      )}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-heading text-sm font-medium">
                        {c.description}
                      </p>
                      <p className="text-text text-xs">{c.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-syne text-heading font-semibold">
                      {fmt(c.amount)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank details placeholder */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-5"
        >
          <h3 className="font-syne text-heading font-semibold">Bank Details</h3>
          <p className="text-text text-sm">
            Bank account management coming soon. Contact admin to update your
            payout details.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
