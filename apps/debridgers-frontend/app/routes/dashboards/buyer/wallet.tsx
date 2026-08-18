import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Landmark,
  Pencil,
} from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  formatCurrency,
  formatFromKobo,
  DashNumberInput,
  DashSubmitButton,
  DashSelectInput,
  DashTextInput,
  type SelectOption,
} from "@debridgers/ui-web";

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

type TransactionType = "deposit" | "withdraw" | "refund";
type TransactionStatus = "pending" | "completed" | "failed";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
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
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    reference: string | null;
    description: string | null;
    created_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface Bank {
  name: string;
  code: string;
  slug: string;
}

interface PayoutAccount {
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface WithdrawResponse {
  withdrawal_id: number;
  amount_kobo: number;
  reference: string;
  status: string;
}

function buildWalletData(api: ApiWalletResponse): WalletData {
  const transactions: Transaction[] = api.transactions.map((tx) => ({
    id: String(tx.id),
    description: tx.description || "Wallet transaction",
    amount: Math.round(tx.amount / 100),
    type: tx.type || "deposit",
    status: tx.status || "completed",
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

/* Shows the last 4 digits only, matching how the bank itself would mask it. */
function maskAccountNumber(accountNumber: string): string {
  return `****${accountNumber.slice(-4)}`;
}

function fmt(n: number) {
  return formatCurrency(n);
}

export default function BuyerWallet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState<boolean>(false);
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);
  const [confirmingDeposit, setConfirmingDeposit] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // === Payout account state
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(
    null,
  );
  const [payoutAccountLoading, setPayoutAccountLoading] =
    useState<boolean>(true);
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState<boolean>(false);
  const [banksLoaded, setBanksLoaded] = useState<boolean>(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [savingPayoutAccount, setSavingPayoutAccount] =
    useState<boolean>(false);
  const [payoutAccountError, setPayoutAccountError] = useState<string | null>(
    null,
  );
  const [confirmedAccountName, setConfirmedAccountName] = useState<
    string | null
  >(null);

  // === Withdraw state
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawReason, setWithdrawReason] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(
    null,
  );

  // Fetch wallet data
  const fetchWalletData = () => {
    apiFetch<ApiWalletResponse>("/buyer/wallet")
      .then((walletData) => setData(buildWalletData(walletData)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchPayoutAccount = () => {
    setPayoutAccountLoading(true);
    apiFetch<PayoutAccount | null>("/buyer/wallet/payout-account")
      .then((account) => setPayoutAccount(account))
      .catch(console.error)
      .finally(() => setPayoutAccountLoading(false));
  };

  useEffect(() => {
    fetchWalletData();
    fetchPayoutAccount();
  }, []);

  /* Banks are a large, slow-to-fetch list, so they load only when the form
     that needs them is actually opened. */
  function loadBanksIfNeeded(): void {
    if (banksLoaded || banksLoading) return;
    setBanksLoading(true);
    apiFetch<Bank[]>("/buyer/wallet/banks")
      .then((list) => {
        setBanks(list);
        setBanksLoaded(true);
      })
      .catch(console.error)
      .finally(() => setBanksLoading(false));
  }

  function openPayoutModal(): void {
    setPayoutAccountError(null);
    setConfirmedAccountName(null);
    setSelectedBankCode(payoutAccount?.bank_code ?? "");
    setAccountNumber("");
    setShowPayoutModal(true);
    loadBanksIfNeeded();
  }

  async function handleSavePayoutAccount(
    e: React.SyntheticEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setPayoutAccountError(null);

    if (!selectedBankCode) {
      setPayoutAccountError("Select a bank.");
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setPayoutAccountError("Account number must be 10 digits.");
      return;
    }

    setSavingPayoutAccount(true);
    try {
      const account = await apiFetch<PayoutAccount>(
        "/buyer/wallet/payout-account",
        {
          method: "POST",
          body: JSON.stringify({
            bank_code: selectedBankCode,
            account_number: accountNumber,
          }),
        },
      );
      setPayoutAccount(account);
      setConfirmedAccountName(account.account_name);
    } catch (err) {
      setPayoutAccountError(
        err instanceof ApiError
          ? err.message
          : "Could not verify this account. Please check the details and try again.",
      );
    } finally {
      setSavingPayoutAccount(false);
    }
  }

  function openWithdrawModal(): void {
    setWithdrawError(null);
    setWithdrawResult(null);
    setWithdrawAmount("");
    setWithdrawReason("");
    setShowWithdrawModal(true);
  }

  async function handleWithdraw(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setWithdrawError(null);

    const amountNaira = parseInt(withdrawAmount, 10);
    if (isNaN(amountNaira) || amountNaira <= 0) {
      setWithdrawError("Enter a valid amount.");
      return;
    }
    if (data && amountNaira > data.availableBalance) {
      setWithdrawError("Amount exceeds your available balance.");
      return;
    }

    setWithdrawing(true);
    try {
      const amountKobo = amountNaira * 100;
      const result = await apiFetch<WithdrawResponse>(
        "/buyer/wallet/withdraw",
        {
          method: "POST",
          body: JSON.stringify({
            amount_kobo: amountKobo,
            ...(withdrawReason.trim() ? { reason: withdrawReason.trim() } : {}),
          }),
        },
      );
      setWithdrawResult(result);
      fetchWalletData();
    } catch (err) {
      setWithdrawError(
        err instanceof ApiError
          ? err.message
          : "Could not process this withdrawal. Please try again.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  /*
   * Returning from Paystack. The reference in the URL only proves the buyer
   * came back, not that they paid, so nothing is treated as successful until
   * the backend has verified the charge with Paystack and credited the wallet.
   * The Paystack webhook does the same job server-side; confirmTransaction is
   * idempotent, so whichever arrives second is a no-op.
   */
  useEffect(() => {
    const ref = searchParams.get("trxref") ?? searchParams.get("reference");

    if (!ref) {
      return;
    }

    setShowFundModal(false);
    setFundAmount("");
    setDepositError(null);
    setConfirmingDeposit(true);

    apiFetch("/buyer/wallet/deposit/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: ref }),
    })
      .then(() => {
        setDepositSuccess(true);
        fetchWalletData();
      })
      .catch((err: unknown) => {
        setDepositError(
          err instanceof ApiError
            ? err.message
            : "We could not confirm this deposit. If you were charged, your balance will update shortly.",
        );
      })
      .finally(() => {
        setConfirmingDeposit(false);
        // Drop the reference so a page refresh cannot replay the confirmation.
        setSearchParams({}, { replace: true });
      });
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
      {/* Deposit outcome. Lives at page level because returning from Paystack
          closes the modal, so a banner inside it would never be seen. */}
      {confirmingDeposit && (
        <div className="border-gray-border text-text rounded-xl border bg-white px-4 py-3 text-sm">
          Confirming your deposit...
        </div>
      )}
      {depositSuccess && !confirmingDeposit && (
        <div className="text-status-delivered-text border-gray-border rounded-xl border bg-white px-4 py-3 text-sm font-medium">
          Funds added successfully.
        </div>
      )}
      {depositError && !confirmingDeposit && (
        <div className="border-gray-border rounded-xl border bg-white px-4 py-3 text-sm font-medium text-red-600">
          {depositError}
        </div>
      )}
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
        <div className="mt-6 flex flex-wrap gap-3">
          <DashSubmitButton
            variant="tertiary"
            type="button"
            icon={Plus}
            onClick={() => setShowFundModal(true)}
          >
            Add Funds
          </DashSubmitButton>
          <DashSubmitButton
            variant="tertiary"
            type="button"
            icon={ArrowUpRight}
            disabled={!payoutAccount || data.availableBalance <= 0}
            onClick={openWithdrawModal}
          >
            Withdraw
          </DashSubmitButton>
        </div>
        {!payoutAccountLoading && !payoutAccount && (
          <p className="mt-3 text-xs text-white/70">
            Add a bank account before you can withdraw from your wallet.
          </p>
        )}
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full border-2 border-white/10" />
      </motion.div>

      {/* === Payout account */}
      <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">Payout Account</h3>
        {payoutAccountLoading ? (
          <div className="bg-gray-border h-16 animate-pulse rounded-xl" />
        ) : payoutAccount ? (
          <div className="border-gray-border flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Landmark size={16} className="text-heading" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-heading text-sm font-medium">
                  {payoutAccount.bank_name}
                </p>
                <p className="text-text text-xs">
                  {maskAccountNumber(payoutAccount.account_number)} ·{" "}
                  {payoutAccount.account_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openPayoutModal}
              className="text-primary flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium"
            >
              <Pencil size={12} /> Change
            </button>
          </div>
        ) : (
          <div className="border-gray-border flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
            <p className="text-text text-sm">
              No payout account on file yet. Add one to enable withdrawals.
            </p>
            <DashSubmitButton
              variant="secondary"
              type="button"
              icon={Landmark}
              onClick={openPayoutModal}
            >
              Add bank account
            </DashSubmitButton>
          </div>
        )}
      </div>

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
          {data.transactions.map((tx, i) => {
            const isInbound = tx.type === "deposit" || tx.type === "refund";
            return (
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
                      isInbound
                        ? "bg-status-delivered-bg"
                        : "bg-status-cancelled-bg"
                    }`}
                  >
                    {isInbound ? (
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
                    <div className="flex items-center gap-2">
                      <p className="text-text text-xs">{tx.date}</p>
                      {tx.status === "pending" && (
                        <span className="text-status-pending-text bg-status-pending-bg rounded-full px-2 py-0.5 text-[10px] font-medium">
                          Pending
                        </span>
                      )}
                      {tx.status === "failed" && (
                        <span className="text-status-cancelled-text bg-status-cancelled-bg rounded-full px-2 py-0.5 text-[10px] font-medium">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={`font-syne font-semibold ${
                    isInbound
                      ? "text-status-delivered-text"
                      : "text-status-cancelled-text"
                  }`}
                >
                  {isInbound ? "+" : "-"}
                  {fmt(tx.amount)}
                </p>
              </motion.div>
            );
          })}
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
              className="fixed inset-0 z-40 cursor-pointer bg-black/40"
              aria-hidden="true"
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
                    <DashSubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowFundModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </DashSubmitButton>
                    <DashSubmitButton
                      variant="primary"
                      loading={funding}
                      loadingText="Processing..."
                      className="flex-1"
                    >
                      Add Funds
                    </DashSubmitButton>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === Payout account modal */}
      <AnimatePresence>
        {showPayoutModal && (
          <>
            <motion.div
              key="payout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 cursor-pointer bg-black/40"
              aria-hidden="true"
              onClick={() => setShowPayoutModal(false)}
            />
            <motion.div
              key="payout-modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-112 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-syne text-heading mb-4 text-lg font-bold">
                {payoutAccount ? "Change payout account" : "Add payout account"}
              </h3>
              {confirmedAccountName ? (
                <div className="flex flex-col gap-4">
                  <div className="border-status-delivered-text/30 bg-status-delivered-bg flex flex-col gap-1 rounded-xl border p-4">
                    <p className="text-status-delivered-text text-sm font-medium">
                      Account verified
                    </p>
                    <p className="text-heading font-syne text-base font-bold">
                      {confirmedAccountName}
                    </p>
                  </div>
                  <DashSubmitButton
                    variant="primary"
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                  >
                    Done
                  </DashSubmitButton>
                </div>
              ) : (
                <form
                  onSubmit={handleSavePayoutAccount}
                  className="flex flex-col gap-4"
                >
                  {payoutAccountError && (
                    <p className="text-sm font-medium text-red-600">
                      {payoutAccountError}
                    </p>
                  )}
                  <DashSelectInput
                    label="Bank"
                    isBank
                    placeholder={
                      banksLoading ? "Loading banks..." : "Select your bank"
                    }
                    disabled={banksLoading}
                    options={banks.map<SelectOption>((bank) => ({
                      value: bank.code,
                      label: bank.name,
                    }))}
                    value={selectedBankCode}
                    onSelectOption={(option) =>
                      setSelectedBankCode(option.value)
                    }
                    required
                  />
                  <DashTextInput
                    label="Account Number"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) =>
                      setAccountNumber(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10 digit NUBAN"
                    required
                  />
                  <div className="flex gap-3">
                    <DashSubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowPayoutModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </DashSubmitButton>
                    <DashSubmitButton
                      variant="primary"
                      loading={savingPayoutAccount}
                      loadingText="Verifying..."
                      className="flex-1"
                    >
                      Save
                    </DashSubmitButton>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === Withdraw modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <>
            <motion.div
              key="withdraw-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 cursor-pointer bg-black/40"
              aria-hidden="true"
              onClick={() => setShowWithdrawModal(false)}
            />
            <motion.div
              key="withdraw-modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-112 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-syne text-heading mb-4 text-lg font-bold">
                Withdraw
              </h3>
              {withdrawResult ? (
                <div className="flex flex-col gap-4">
                  <div className="border-status-pending-text/30 bg-status-pending-bg flex flex-col gap-1 rounded-xl border p-4">
                    <p className="text-status-pending-text text-sm font-medium">
                      Withdrawal processing
                    </p>
                    <p className="text-heading font-syne text-base font-bold">
                      {formatFromKobo(withdrawResult.amount_kobo)}
                    </p>
                    <p className="text-text text-xs">
                      Reference {withdrawResult.reference}. This will show as
                      pending until the transfer is confirmed.
                    </p>
                  </div>
                  <DashSubmitButton
                    variant="primary"
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Done
                  </DashSubmitButton>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
                  <div className="bg-bg-light flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                    <span className="text-text text-sm">Available</span>
                    <span className="font-syne text-heading text-base font-bold">
                      {fmt(data.availableBalance)}
                    </span>
                  </div>
                  {withdrawError && (
                    <p className="text-sm font-medium text-red-600">
                      {withdrawError}
                    </p>
                  )}
                  <DashNumberInput
                    label="Amount"
                    min={1}
                    max={data.availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                  />
                  <DashTextInput
                    label="Reason (optional)"
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    placeholder="e.g. Cashing out"
                  />
                  <div className="flex gap-3">
                    <DashSubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </DashSubmitButton>
                    <DashSubmitButton
                      variant="primary"
                      loading={withdrawing}
                      loadingText="Processing..."
                      className="flex-1"
                    >
                      Withdraw
                    </DashSubmitButton>
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
