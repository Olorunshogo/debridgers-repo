import { motion } from "framer-motion";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export function meta() {
  return [{ title: "Wallet | Debridgers" }];
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: string;
  date: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    type: "credit",
    description: "Commission payout",
    amount: "+₦27,000",
    date: "Apr 5, 2026",
  },
  {
    id: "t2",
    type: "credit",
    description: "Commission payout",
    amount: "+₦18,000",
    date: "Apr 3, 2026",
  },
  {
    id: "t3",
    type: "debit",
    description: "Withdrawal to bank",
    amount: "-₦20,000",
    date: "Apr 1, 2026",
  },
  {
    id: "t4",
    type: "credit",
    description: "Commission payout",
    amount: "+₦22,500",
    date: "Mar 31, 2026",
  },
];

export default function AgentWalletPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 rounded-2xl p-6"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          <p className="text-sm text-white/70">Available Balance</p>
          <p className="font-syne text-3xl font-bold text-white">₦47,500</p>
          <button
            className="mt-2 self-start rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--secondary-color)",
              color: "var(--heading-colour)",
            }}
          >
            Withdraw
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
            ₦67,500
          </p>
          <p className="text-xs" style={{ color: "var(--text-colour)" }}>
            Across all commissions
          </p>
        </motion.div>
      </div>

      {/* Transactions */}
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
            Recent Transactions
          </h3>
        </div>
        {MOCK_TRANSACTIONS.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
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
                <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                  {t.date}
                </p>
              </div>
            </div>
            <span
              className="font-syne text-sm font-bold"
              style={{
                color:
                  t.type === "credit" ? "var(--status-active-text)" : "#DC2626",
              }}
            >
              {t.amount}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
