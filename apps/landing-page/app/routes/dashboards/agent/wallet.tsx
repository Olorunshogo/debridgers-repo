import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { apiFetch } from "../../../utils/apiFetch";

export function meta() {
  return [{ title: "Wallet | Debridgers" }];
}

interface ApiWallet {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
}

interface ApiCommission {
  id: number;
  type: string;
  amount: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amountKobo: number;
  date: string;
  status: string;
}

function fmt(kobo: number) {
  return (
    "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })
  );
}

function commissionLabel(type: string) {
  switch (type) {
    case "direct":
      return "Direct commission";
    case "buyer_referral":
      return "Buyer referral commission";
    case "agent_override":
      return "Agent override commission";
    case "state_manager_override":
      return "State manager override";
    default:
      return "Commission";
  }
}

export default function AgentWalletPage() {
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<ApiWallet>("/agent/wallet"),
      apiFetch<ApiCommission[]>("/agent/commissions"),
    ])
      .then(([w, commissions]) => {
        setWallet(w);
        setTransactions(
          commissions.map((c) => ({
            id: String(c.id),
            type: "credit" as const,
            description: commissionLabel(c.type),
            amountKobo: Math.round(parseFloat(c.amount)),
            date: new Date(c.created_at).toLocaleDateString("en-NG", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status: c.status,
          })),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !wallet) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="h-36 rounded-2xl"
            style={{ backgroundColor: "var(--border-gray)" }}
          />
          <div
            className="h-36 rounded-2xl"
            style={{ backgroundColor: "var(--border-gray)" }}
          />
        </div>
        <div
          className="h-64 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Wallet size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Wallet
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Your earnings and transaction history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 rounded-2xl p-6"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          <p className="text-sm text-white/70">Available Balance</p>
          <p className="font-syne text-3xl font-bold text-white">
            {fmt(wallet.available_balance)}
          </p>
          <button
            disabled
            className="mt-2 cursor-not-allowed self-start rounded-full px-5 py-2 text-sm font-semibold opacity-60"
            style={{
              backgroundColor: "var(--secondary-color)",
              color: "var(--heading-colour)",
            }}
            title="Withdrawal coming soon"
          >
            Withdraw (coming soon)
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex flex-col gap-2 rounded-2xl border p-6"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Total Earned (All Time)
          </p>
          <p
            className="font-syne text-3xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            {fmt(wallet.total_earned)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-colour)" }}>
            Pending: {fmt(wallet.pending_balance)}
          </p>
        </motion.div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="border-b px-5 py-4"
          style={{ borderColor: "var(--border-gray)" }}
        >
          <h3
            className="font-syne font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Commission History
          </h3>
        </div>

        {transactions.length === 0 ? (
          <p
            className="py-10 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
            No commissions earned yet.
          </p>
        ) : (
          transactions.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between border-b px-5 py-4 last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <div className="flex items-center gap-3">
                {t.type === "credit" ? (
                  <ArrowDownCircle size={20} className="text-green-500" />
                ) : (
                  <ArrowUpCircle size={20} className="text-red-400" />
                )}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {t.description}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {t.date} · {t.status}
                  </p>
                </div>
              </div>
              <span
                className="font-syne text-sm font-bold"
                style={{ color: "var(--status-delivered-text)" }}
              >
                +{fmt(t.amountKobo)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
