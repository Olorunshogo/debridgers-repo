import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";

export function meta() {
  return [{ title: "Wallet & Payment | Debridgers" }];
}

type TransactionType = "credit" | "debit";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
}

interface WalletData {
  balance: number;
  totalSpent: number;
  totalFunded: number;
  transactions: Transaction[];
}

const MOCK_DATA: WalletData = {
  balance: 15250,
  totalSpent: 42500,
  totalFunded: 57750,
  transactions: [
    {
      id: "t1",
      description: "Wallet top-up via bank transfer",
      amount: 10000,
      type: "credit",
      date: "Mar 26, 2026",
    },
    {
      id: "t2",
      description: "Order #AGL-0024 — Rice, Beans, Palm Oil",
      amount: 6800,
      type: "debit",
      date: "Mar 24, 2026",
    },
    {
      id: "t3",
      description: "Order #AGL-0023 — Beans, Yam",
      amount: 5300,
      type: "debit",
      date: "Mar 22, 2026",
    },
    {
      id: "t4",
      description: "Wallet top-up via bank transfer",
      amount: 20000,
      type: "credit",
      date: "Mar 20, 2026",
    },
    {
      id: "t5",
      description: "Order #AGL-0022 — Rice, Gari",
      amount: 3200,
      type: "debit",
      date: "Mar 18, 2026",
    },
    {
      id: "t6",
      description: "Order #AGL-0021 — Rice, Yam, Palm Oil",
      amount: 8800,
      type: "debit",
      date: "Mar 15, 2026",
    },
  ],
};

function fmt(n: number) {
  return "₦" + n.toLocaleString();
}

export default function BuyerWallet() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  async function handleFund(e: React.FormEvent) {
    e.preventDefault();
    setFunding(true);
    await new Promise<void>((r) => setTimeout(r, 900));
    setFunding(false);
    setFunded(true);
    setFundAmount("");
    setTimeout(() => {
      setFunded(false);
      setShowFundModal(false);
    }, 2000);
  }

  if (loading || !data) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div
          className="h-36 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
        <div
          className="h-64 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white/60">Wallet Balance</p>
            <p className="font-syne text-4xl font-extrabold text-white">
              {fmt(data.balance)}
            </p>
          </div>
          <div className="flex gap-3">
            <div
              className="flex min-w-[130px] flex-col gap-1 rounded-xl border border-white/20 p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs text-white/60">Total Funded</p>
              <p className="font-syne text-lg font-bold text-white">
                {fmt(data.totalFunded)}
              </p>
            </div>
            <div
              className="flex min-w-[130px] flex-col gap-1 rounded-xl border border-white/20 p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs text-white/60">Total Spent</p>
              <p className="font-syne text-lg font-bold text-white">
                {fmt(data.totalSpent)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setShowFundModal(true)}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--secondary-color)",
              color: "var(--heading-colour)",
            }}
          >
            <Plus size={16} />
            Add Funds
          </button>
        </div>
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full border-2 border-white/10" />
      </motion.div>

      <div
        className="flex flex-col gap-4 rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Transaction History
        </h3>
        <div className="flex flex-col">
          {data.transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between border-b py-4 last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor:
                      tx.type === "credit"
                        ? "var(--status-delivered-bg)"
                        : "var(--status-cancelled-bg)",
                  }}
                >
                  {tx.type === "credit" ? (
                    <ArrowDownLeft
                      size={16}
                      style={{ color: "var(--status-delivered-text)" }}
                    />
                  ) : (
                    <ArrowUpRight
                      size={16}
                      style={{ color: "var(--status-cancelled-text)" }}
                    />
                  )}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {tx.description}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {tx.date}
                  </p>
                </div>
              </div>
              <p
                className="font-syne font-semibold"
                style={{
                  color:
                    tx.type === "credit"
                      ? "var(--status-delivered-text)"
                      : "var(--status-cancelled-text)",
                }}
              >
                {tx.type === "credit" ? "+" : "-"}
                {fmt(tx.amount)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showFundModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowFundModal(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
              style={{ backgroundColor: "var(--white)" }}
            >
              <h3
                className="font-syne mb-4 text-lg font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                Add Funds
              </h3>
              {funded ? (
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--status-delivered-text)" }}
                >
                  Funds added successfully!
                </p>
              ) : (
                <form onSubmit={handleFund} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      required
                      className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                      style={{
                        borderColor: "var(--border-gray)",
                        backgroundColor: "var(--bg-light)",
                        color: "var(--heading-colour)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--primary-color)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--border-gray)";
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowFundModal(false)}
                      className="flex-1 rounded-full border py-3 text-sm font-medium"
                      style={{
                        borderColor: "var(--border-gray)",
                        color: "var(--text-colour)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={funding}
                      className="flex-1 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: "var(--primary-color)" }}
                    >
                      {funding ? "Processing..." : "Add Funds"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
