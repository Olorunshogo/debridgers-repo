import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Wallet & Payment | Debridgers" },
    {
      name: "description",
      content:
        "Manage your Debridgers wallet balance, top up funds and view your payment history.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
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

interface ApiOrder {
  id: number;
  status: string;
  total_amount: number;
  quantity: number;
  created_at: string;
}

interface ApiDashStats {
  stats: {
    total_spent_kobo: number;
    total_orders: number;
  };
}

function buildWalletData(stats: ApiDashStats, orders: ApiOrder[]): WalletData {
  const totalSpentKobo = stats.stats.total_spent_kobo;
  const totalSpentNaira = Math.round(totalSpentKobo / 100);

  const transactions: Transaction[] = orders.map((o) => ({
    id: String(o.id),
    description: `Order #DBR-${String(o.id).padStart(4, "0")}: ${o.quantity} pack${o.quantity !== 1 ? "s" : ""}`,
    amount: Math.round(o.total_amount / 100),
    type: "debit" as const,
    date: new Date(o.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return {
    balance: 0,
    totalSpent: totalSpentNaira,
    totalFunded: 0,
    transactions,
  };
}

function fmt(n: number) {
  return "₦" + n.toLocaleString();
}

export default function BuyerWallet() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState<boolean>(false);
  const [funded, setFunded] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      apiFetch<ApiDashStats>("/buyer/dashboard"),
      apiFetch<ApiOrder[]>("/buyer/orders"),
    ])
      .then(([stats, orders]) => setData(buildWalletData(stats, orders)))
      .catch(console.error)
      .finally(() => setLoading(false));
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
        <div className="bg-gray-border h-36 rounded-2xl" />
        <div className="bg-gray-border h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-primary relative overflow-hidden rounded-2xl p-6 lg:p-8"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white/60">
              Total Spent (delivered orders)
            </p>
            <p className="font-syne text-4xl font-extrabold text-white">
              {fmt(data.totalSpent)}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-white/60">Total Orders</p>
              <p className="font-syne text-lg font-bold text-white">
                {data.transactions.length}
              </p>
            </div>
            <div className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-white/60">Wallet Top-up</p>
              <p className="font-syne text-base font-bold text-white/60">
                Coming soon
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            disabled
            className="bg-secondary text-heading inline-flex cursor-not-allowed items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold opacity-50"
            title="Wallet top-up coming soon"
          >
            <Plus size={16} />
            Add Funds (coming soon)
          </button>
        </div>
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full border-2 border-white/10" />
      </motion.div>

      <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">
          Transaction History
        </h3>
        <div className="flex flex-col">
          {data.transactions.length === 0 && (
            <p className="text-text py-8 text-center text-sm">
              No orders yet. Your order history will appear here.
            </p>
          )}
          {data.transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-gray-border flex items-center justify-between border-b py-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    tx.type === "credit"
                      ? "bg-status-delivered-bg"
                      : "bg-status-cancelled-bg"
                  }`}
                >
                  {tx.type === "credit" ? (
                    <ArrowDownLeft
                      size={16}
                      className="text-status-delivered-text"
                    />
                  ) : (
                    <ArrowUpRight
                      size={16}
                      className="text-status-cancelled-text"
                    />
                  )}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-heading text-sm font-medium">
                    {tx.description}
                  </p>
                  <p className="text-text text-xs">{tx.date}</p>
                </div>
              </div>
              <p
                className={`font-syne font-semibold ${
                  tx.type === "credit"
                    ? "text-status-delivered-text"
                    : "text-status-cancelled-text"
                }`}
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
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-112 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-syne text-heading mb-4 text-lg font-bold">
                Add Funds
              </h3>
              {funded ? (
                <p className="text-status-delivered-text text-sm font-medium">
                  Funds added successfully!
                </p>
              ) : (
                <form onSubmit={handleFund} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-heading text-sm font-medium">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      required
                      className="border-gray-border focus:border-primary text-heading bg-bg-light w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowFundModal(false)}
                      className="border-gray-border text-text flex-1 rounded-full border py-3 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={funding}
                      className="bg-primary flex-1 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
