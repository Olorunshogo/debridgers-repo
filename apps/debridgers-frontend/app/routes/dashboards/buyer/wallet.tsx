import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router";
import { ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { formatCurrency, DashNumberInput } from "@debridgers/ui-web";

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

type TransactionType = "deposit" | "refund";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
}

interface WalletData {
  availableBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  transactions: Transaction[];
}

interface ApiWalletResponse {
  wallet: {
    id: number;
    available_balance: number;
    pending_balance: number;
    total_deposited: number;
  };
  transactions: Array<{
    id: number;
    type: string;
    amount: number;
    status: string;
    reference?: string;
    description: string;
    created_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

function buildWalletData(api: ApiWalletResponse): WalletData {
  const transactions: Transaction[] = api.transactions.map((tx) => ({
    id: String(tx.id),
    description: tx.description,
    amount: Math.round(tx.amount / 100),
    type: (tx.type as TransactionType) || "deposit",
    date: new Date(tx.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return {
    availableBalance: Math.round(api.wallet.available_balance / 100),
    pendingBalance: Math.round(api.wallet.pending_balance / 100),
    totalDeposited: Math.round(api.wallet.total_deposited / 100),
    transactions,
  };
}

function fmt(n: number) {
  return formatCurrency(n);
}

export default function BuyerWallet() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState<boolean>(false);
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);

  // Fetch wallet data
  const fetchWalletData = () => {
    apiFetch<ApiWalletResponse>("/buyer/wallet")
      .then((walletData) => setData(buildWalletData(walletData)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Detect return from Paystack deposit
  useEffect(() => {
    const ref = searchParams.get("trxref") ?? searchParams.get("reference");
    if (ref) {
      setDepositSuccess(true);
      setShowFundModal(false);
      setFundAmount("");
      // Refresh wallet data after deposit
      fetchWalletData();
    }
  }, [searchParams]);

  async function handleFund(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFunding(true);

    try {
      const amountNaira = parseInt(fundAmount, 10);
      if (isNaN(amountNaira) || amountNaira < 100) {
        alert("Minimum amount is ₦100");
        setFunding(false);
        return;
      }

      const amountKobo = amountNaira * 100;
      const response = await apiFetch<{
        authorization_url: string;
        reference: string;
      }>("/buyer/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ amount_kobo: amountKobo }),
      });

      if (response?.authorization_url) {
        window.location.href = response.authorization_url;
      } else {
        alert("Failed to initiate payment. Please try again.");
        setFunding(false);
      }
    } catch (err) {
      console.error("Deposit error:", err);
      alert("Error initiating deposit. Please try again.");
      setFunding(false);
    }
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
            <p className="text-sm text-white/60">Available Balance</p>
            <p className="font-syne text-4xl font-extrabold text-white">
              {fmt(data.availableBalance)}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-white/60">Pending Balance</p>
              <p className="font-syne text-lg font-bold text-white">
                {fmt(data.pendingBalance)}
              </p>
            </div>
            <div className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-white/60">Total Deposited</p>
              <p className="font-syne text-base font-bold text-white">
                {fmt(data.totalDeposited)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setShowFundModal(true)}
            className="bg-secondary text-heading inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Funds
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
                    tx.type === "deposit"
                      ? "bg-status-delivered-bg"
                      : "bg-status-cancelled-bg"
                  }`}
                >
                  {tx.type === "deposit" ? (
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
                  tx.type === "deposit"
                    ? "text-status-delivered-text"
                    : "text-status-cancelled-text"
                }`}
              >
                {tx.type === "deposit" ? "+" : "-"}
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
              {depositSuccess ? (
                <p className="text-status-delivered-text text-sm font-medium">
                  Funds added successfully!
                </p>
              ) : (
                <form onSubmit={handleFund} className="flex flex-col gap-4">
                  <DashNumberInput
                    label="Amount"
                    min={100}
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                  />
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
