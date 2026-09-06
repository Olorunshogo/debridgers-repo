import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Landmark,
  Copy,
  Check,
  Loader2,
  Receipt,
} from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  formatCurrency,
  formatFromKobo,
  NumberInputField,
  SubmitButton,
  SelectInputField,
  TextInputField,
  DataTable,
  TablePrimaryCell,
  TableTextCell,
  TableDateCell,
  TableStatusBadge,
  TableEmptyState,
  type StatusTone,
  type TableColumn,
  type SelectOption,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Wallet & Payment | Debridgers",
    description:
      "Manage your Debridgers wallet balance, top up funds and view your payment history.",
    path: "/wallet",
    noIndex: true,
  });
}

type TransactionType = "deposit" | "withdraw" | "refund";

/* The buyer's own Debridgers account number, issued by Paystack at signup. Not
   supplied by the buyer - money in. Distinct from the payout account, which the
   buyer does supply, and which is money out. */
interface DedicatedAccount {
  account_number: string;
  bank_name: string;
  account_name: string;
}

/*
 * A transfer that has been shown to the buyer but not yet seen to settle.
 *
 * Kept in sessionStorage, not component state: settlement is observed by
 * comparing the balance against what it was when the buyer was given the
 * account details, and that baseline has to survive the refresh they will
 * inevitably do while waiting for a bank transfer to land.
 */
const PENDING_TRANSFER_KEY = "debridgers_pending_transfer";

interface PendingTransfer {
  /* available_balance in kobo at the moment the details were shown. */
  baselineKobo: number;
  startedAt: number;
}

/* Stop watching eventually. A transfer can outlive any session, and at that
   point the webhook plus the transactions list are the record, not a spinner. */
const TRANSFER_WATCH_TIMEOUT_MS = 10 * 60 * 1000;
const TRANSFER_POLL_MS = 4000;
/* Long enough to read "it landed" before the page changes under them. */
const SETTLED_REDIRECT_DELAY_MS = 3000;

function readPendingTransfer(): PendingTransfer | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TRANSFER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingTransfer;
    if (typeof parsed?.baselineKobo !== "number") return null;
    if (Date.now() - parsed.startedAt > TRANSFER_WATCH_TIMEOUT_MS) {
      sessionStorage.removeItem(PENDING_TRANSFER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePendingTransfer(baselineKobo: number): void {
  try {
    sessionStorage.setItem(
      PENDING_TRANSFER_KEY,
      JSON.stringify({ baselineKobo, startedAt: Date.now() }),
    );
  } catch {
    /* Without storage the watcher simply does not arm. The webhook still
       credits the wallet; the buyer just has to refresh to see it. */
  }
}

function clearPendingTransfer(): void {
  try {
    sessionStorage.removeItem(PENDING_TRANSFER_KEY);
  } catch {
    /* Nothing to clear. */
  }
}
type TransactionStatus = "pending" | "completed" | "failed";

/*
 * Raw kobo and an ISO timestamp, not display strings. The table sorts on these,
 * and a formatted date sorts alphabetically while a naira-rounded amount loses
 * the kobo the sort needs.
 */
interface Transaction {
  id: string;
  description: string;
  amountKobo: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
}

const TRANSACTION_STATUS: Record<
  TransactionStatus,
  { tone: StatusTone; label: string }
> = {
  completed: { tone: "success", label: "Completed" },
  pending: { tone: "warning", label: "Pending" },
  failed: { tone: "danger", label: "Failed" },
};

const TRANSACTION_LABEL: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdraw: "Withdrawal",
  refund: "Refund",
};

/* Money coming in is signed and coloured differently from money going out,
   which is the one thing a reader scans a transaction list for. */
function isInbound(type: TransactionType): boolean {
  return type === "deposit" || type === "refund";
}

const TRANSACTION_COLUMNS: readonly TableColumn<Transaction>[] = [
  {
    id: "description",
    header: "Description",
    priority: "primary",
    minWidth: "16rem",
    sortable: true,
    sortValue: (t) => t.description,
    searchValue: (t) => `${t.description} ${TRANSACTION_LABEL[t.type]}`,
    cell: (t) => (
      <TablePrimaryCell
        title={t.description}
        leading={
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isInbound(t.type) ? "bg-status-delivered" : "bg-status-cancelled"
            }`}
          >
            {isInbound(t.type) ? (
              <ArrowDownLeft size={16} className="text-status-delivered-fg" />
            ) : (
              <ArrowUpRight size={16} className="text-status-cancelled-fg" />
            )}
          </span>
        }
      />
    ),
  },
  {
    id: "type",
    header: "Type",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (t) => t.type,
    cell: (t) => <TableTextCell value={TRANSACTION_LABEL[t.type]} />,
  },
  {
    id: "date",
    header: "Date",
    priority: "secondary",
    minWidth: "9rem",
    sortable: true,
    sortValue: (t) => t.createdAt,
    cell: (t) => <TableDateCell value={t.createdAt} />,
  },
  {
    id: "status",
    header: "Status",
    priority: "detail",
    minWidth: "8rem",
    sortable: true,
    sortValue: (t) => t.status,
    cell: (t) => (
      <TableStatusBadge
        label={TRANSACTION_STATUS[t.status].label}
        tone={TRANSACTION_STATUS[t.status].tone}
      />
    ),
  },
  {
    id: "amount",
    header: "Amount",
    priority: "trailing",
    align: "right",
    minWidth: "9rem",
    sortable: true,
    /* Signed, so a sort puts withdrawals and deposits on opposite ends
       rather than interleaving them by magnitude. */
    sortValue: (t) => (isInbound(t.type) ? t.amountKobo : -t.amountKobo),
    cell: (t) => (
      <span
        className={`font-syne font-semibold ${
          isInbound(t.type)
            ? "text-status-delivered-fg"
            : "text-status-cancelled-fg"
        }`}
      >
        {isInbound(t.type) ? "+" : "-"}
        {formatFromKobo(t.amountKobo)}
      </span>
    ),
  },
];

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
    amountKobo: tx.amount,
    type: tx.type || "deposit",
    status: tx.status || "completed",
    createdAt: tx.created_at,
  }));

  return {
    availableBalance: Math.round(api.wallet.available_balance / 100),
    pendingBalance: Math.round(api.wallet.pending_balance / 100),
    totalDeposited: Math.round(api.wallet.total_deposited / 100),
    transactions,
  };
}

/* Shows the last 4 digits only, matching how the bank itself would mask it.
   Commented out with the payout-account card it belongs to, below. */
/* function maskAccountNumber(accountNumber: string): string {
  return `****${accountNumber.slice(-4)}`;
} */

function fmt(n: number) {
  return formatCurrency(n);
}

export default function BuyerWallet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState<boolean>(false);
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);
  const [confirmingDeposit, setConfirmingDeposit] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [dva, setDva] = useState<DedicatedAccount | null>(null);
  const [dvaLoading, setDvaLoading] = useState<boolean>(true);
  const [dvaRepairing, setDvaRepairing] = useState<boolean>(false);
  const [dvaRepairFailed, setDvaRepairFailed] = useState<boolean>(false);
  /* One automatic repair attempt per mount. Creating a virtual account calls
     Paystack, so it must not fire on every render or modal reopen. */
  const dvaRepairTried = useRef<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  /* Set only once the balance has actually been observed to rise. */
  const [transferSettled, setTransferSettled] = useState<boolean>(false);
  const [watchingTransfer, setWatchingTransfer] = useState<boolean>(
    () => readPendingTransfer() !== null,
  );

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

  const fetchDva = () => {
    apiFetch<DedicatedAccount | null>("/buyer/wallet/dva")
      .then(setDva)
      .catch(() => setDva(null))
      .finally(() => setDvaLoading(false));
  };

  /*
   * Recreates the virtual account when signup could not.
   *
   * Registration deliberately swallows a Paystack outage rather than blocking
   * the buyer, which leaves some accounts unmade. Without this the panel above
   * would read "still being set up" forever, because nothing else ever retries.
   */
  const repairDva = () => {
    if (dvaRepairing) return;
    setDvaRepairing(true);
    setDvaRepairFailed(false);

    apiFetch<DedicatedAccount>("/buyer/wallet/dva", { method: "POST" })
      .then((created) => setDva(created))
      .catch(() => setDvaRepairFailed(true))
      .finally(() => setDvaRepairing(false));
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
    fetchDva();
  }, []);

  /*
   * Watches for a bank transfer to land.
   *
   * Settlement is decided by one thing only: the wallet balance, read back from
   * our own ledger, being higher than it was when the buyer was shown the
   * account details. Not a timer, not the fact that a poll happened to fire,
   * not anything Paystack's widget reports - the webhook credits the wallet and
   * this observes the result.
   *
   * That makes it idempotent by construction. The baseline lives in
   * sessionStorage, so a refresh mid-transfer re-reads the balance, compares it
   * to the same baseline, and reaches the same conclusion. Nothing about the
   * outcome depends on this component having stayed mounted.
   */
  useEffect(() => {
    if (!watchingTransfer) return;

    let cancelled = false;

    function check(): void {
      const pending = readPendingTransfer();
      if (!pending) {
        /* Timed out or cleared elsewhere - stop, and leave the balance alone. */
        if (!cancelled) setWatchingTransfer(false);
        return;
      }

      apiFetch<ApiWalletResponse>("/buyer/wallet")
        .then((walletData) => {
          if (cancelled) return;
          setData(buildWalletData(walletData));

          if (walletData.wallet.available_balance > pending.baselineKobo) {
            /* Consume the baseline first: settlement is now recorded in the
               balance itself, and must not be re-detected on a later mount. */
            clearPendingTransfer();
            setWatchingTransfer(false);
            setTransferSettled(true);
          }
        })
        .catch(() => {
          /* A failed poll is not a failed transfer. Leave the baseline in place
             and try again on the next tick. */
        });
    }

    /* Immediately, so a refresh after settlement resolves on first paint
       rather than after a poll interval. */
    check();
    const timer = window.setInterval(check, TRANSFER_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [watchingTransfer]);

  /* The pause is a courtesy so the buyer can read the outcome. It runs after
     settlement was observed, and is never what decides that it settled. */
  useEffect(() => {
    if (!transferSettled) return;
    const timer = window.setTimeout(() => {
      navigate("/buyer-dashboard");
    }, SETTLED_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [transferSettled, navigate]);

  /* Arms the watcher when the buyer is shown where to transfer to. */
  function beginTransferWatch(): void {
    if (!data) return;
    writePendingTransfer(Math.round(data.availableBalance * 100));
    setWatchingTransfer(true);
  }

  async function copyAccountNumber(): Promise<void> {
    if (!dva) return;
    try {
      await navigator.clipboard.writeText(dva.account_number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked - the number is on screen to be typed. */
    }
  }

  useEffect(() => {
    if (!showFundModal || dvaLoading || dva || dvaRepairTried.current) return;
    dvaRepairTried.current = true;
    repairDva();
    /* repairDva is stable enough for this one-shot; the ref is the real guard. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFundModal, dvaLoading, dva]);

  /* Banks are a large, slow-to-fetch list, so they load only when the form
     that needs them is actually opened. Left live, unlike its caller: the
     payout modal it feeds is still in the file, so commenting it out would
     strand the banks state that modal reads. */
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

  /* Commented out with the payout-account card that calls it, below. */
  /* function openPayoutModal(): void {
    setPayoutAccountError(null);
    setConfirmedAccountName(null);
    setSelectedBankCode(payoutAccount?.bank_code ?? "");
    setAccountNumber("");
    setShowPayoutModal(true);
    loadBanksIfNeeded();
  } */

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

  /* Commented out with the Withdraw button that calls it, below. */
  /* function openWithdrawModal(): void {
    setWithdrawError(null);
    setWithdrawResult(null);
    setWithdrawAmount("");
    setWithdrawReason("");
    setShowWithdrawModal(true);
  } */

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
  }, [searchParams, setSearchParams]);

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
        <div className="bg-line h-36 rounded-2xl" />
        <div className="bg-line h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Deposit outcome. Lives at page level because returning from Paystack
          closes the modal, so a banner inside it would never be seen. */}
      {confirmingDeposit && (
        <div className="border-line text-body rounded-xl border bg-white px-4 py-3 text-sm">
          Confirming your deposit...
        </div>
      )}
      {depositSuccess && !confirmingDeposit && (
        <div className="text-status-delivered-fg border-line rounded-xl border bg-white px-4 py-3 text-sm font-medium">
          Funds added successfully.
        </div>
      )}
      {depositError && !confirmingDeposit && (
        <div className="border-line rounded-xl border bg-white px-4 py-3 text-sm font-medium text-red-600">
          {depositError}
        </div>
      )}

      {/* Transfer outcome, also at page level: the buyer can close the modal
          and wander off, and the watcher keeps running either way. */}
      {watchingTransfer && (
        <div className="border-line text-body flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Waiting for your transfer to land. You do not need to stay on this
          page.
        </div>
      )}
      {transferSettled && (
        <div className="text-status-delivered-fg border-line rounded-xl border bg-white px-4 py-3 text-sm font-medium">
          Transfer received. Taking you to your overview...
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
          <SubmitButton
            variant="tertiary"
            type="button"
            icon={Plus}
            onClick={() => setShowFundModal(true)}
          >
            Add Funds
          </SubmitButton>
          {/* <SubmitButton
            variant="tertiary"
            type="button"
            icon={ArrowUpRight}
            disabled={!payoutAccount || data.availableBalance <= 0}
            onClick={openWithdrawModal}
          >
            Withdraw
          </SubmitButton> */}
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
      {/* <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <h3 className="font-syne text-heading font-semibold">Payout Account</h3>
        {payoutAccountLoading ? (
          <div className="bg-line h-16 animate-pulse rounded-xl" />
        ) : payoutAccount ? (
          <div className="border-line flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Landmark size={16} className="text-heading" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-heading text-sm font-medium">
                  {payoutAccount.bank_name}
                </p>
                <p className="text-body text-xs">
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
          <div className="border-line flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
            <p className="text-body text-sm">
              No payout account on file yet. Add one to enable withdrawals.
            </p>
            <SubmitButton
              variant="secondary"
              type="button"
              icon={Landmark}
              onClick={openPayoutModal}
            >
              Add bank account
            </SubmitButton>
          </div>
        )}
      </div> */}

      <DataTable
        rows={data.transactions}
        columns={TRANSACTION_COLUMNS}
        caption="Transaction history"
        showSearch
        searchPlaceholder="Search transactions"
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyState={
          <TableEmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Deposits, withdrawals and order payments will appear here."
          />
        }
      />

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

              {/* === Transfer to your own Debridgers account
                  Issued at signup, so there is nothing for the buyer to set up.
                  Shown before the card form because a transfer costs them
                  nothing and settles into the same wallet. */}
              {!depositSuccess && !transferSettled && (
                <div className="border-line mb-4 flex flex-col gap-3 rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-heading text-sm font-semibold">
                        Transfer to your account
                      </p>
                      <p className="text-body text-xs">
                        Money sent here lands in your wallet automatically.
                      </p>
                    </div>
                    <Landmark
                      size={18}
                      className="text-body mt-0.5 shrink-0 opacity-60"
                    />
                  </div>

                  {dvaLoading ? (
                    <div className="bg-line h-16 animate-pulse rounded-lg" />
                  ) : dva ? (
                    <>
                      <div className="bg-light-bg flex flex-col gap-1 rounded-lg px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-syne text-heading text-lg font-bold tracking-wide">
                            {dva.account_number}
                          </p>
                          <button
                            type="button"
                            onClick={copyAccountNumber}
                            aria-label="Copy account number"
                            className="text-body hover:text-heading flex items-center gap-1 text-xs transition-colors"
                          >
                            {copied ? (
                              <>
                                <Check size={14} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-body text-xs">
                          {dva.bank_name} - {dva.account_name}
                        </p>
                      </div>

                      {watchingTransfer ? (
                        <p className="text-body flex items-center gap-2 text-xs">
                          <Loader2 size={14} className="animate-spin" />
                          Waiting for your transfer. This page updates itself.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={beginTransferWatch}
                          className="text-primary self-start text-xs font-medium underline underline-offset-2"
                        >
                          I have sent the transfer
                        </button>
                      )}
                    </>
                  ) : dvaRepairing ? (
                    <p className="text-body flex items-center gap-2 text-xs">
                      <Loader2 size={14} className="animate-spin" />
                      Setting up your account number...
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-body text-xs">
                        {dvaRepairFailed
                          ? "We could not set up your account number just now. Use the card option below, or try again."
                          : "Your account number is still being set up. Use the card option below."}
                      </p>
                      <button
                        type="button"
                        onClick={repairDva}
                        className="text-primary self-start text-xs font-medium underline underline-offset-2"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {transferSettled ? (
                <div className="flex flex-col gap-2">
                  <p className="text-status-delivered-fg text-sm font-medium">
                    Transfer received. Your wallet has been credited.
                  </p>
                  <p className="text-body text-xs">
                    Taking you to your overview...
                  </p>
                </div>
              ) : depositSuccess ? (
                <p className="text-status-delivered-fg text-sm font-medium">
                  Funds added successfully!
                </p>
              ) : (
                <form onSubmit={handleFund} className="flex flex-col gap-4">
                  <p className="text-body text-xs">Or pay with a card:</p>
                  <NumberInputField
                    label="Amount"
                    min={100}
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                  />
                  <div className="flex gap-3">
                    <SubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowFundModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </SubmitButton>
                    <SubmitButton
                      variant="primary"
                      loading={funding}
                      loadingText="Processing..."
                      className="flex-1"
                    >
                      Add Funds
                    </SubmitButton>
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
                  <div className="border-status-delivered-fg/30 bg-status-delivered flex flex-col gap-1 rounded-xl border p-4">
                    <p className="text-status-delivered-fg text-sm font-medium">
                      Account verified
                    </p>
                    <p className="text-heading font-syne text-base font-bold">
                      {confirmedAccountName}
                    </p>
                  </div>
                  <SubmitButton
                    variant="primary"
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                  >
                    Done
                  </SubmitButton>
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
                  <SelectInputField
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
                  <TextInputField
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
                    <SubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowPayoutModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </SubmitButton>
                    <SubmitButton
                      variant="primary"
                      loading={savingPayoutAccount}
                      loadingText="Verifying..."
                      className="flex-1"
                    >
                      Save
                    </SubmitButton>
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
                  <div className="border-status-pending-fg/30 bg-status-pending flex flex-col gap-1 rounded-xl border p-4">
                    <p className="text-status-pending-fg text-sm font-medium">
                      Withdrawal processing
                    </p>
                    <p className="text-heading font-syne text-base font-bold">
                      {formatFromKobo(withdrawResult.amount_kobo)}
                    </p>
                    <p className="text-body text-xs">
                      Reference {withdrawResult.reference}. This will show as
                      pending until the transfer is confirmed.
                    </p>
                  </div>
                  <SubmitButton
                    variant="primary"
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Done
                  </SubmitButton>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
                  <div className="bg-light-bg flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                    <span className="text-body text-sm">Available</span>
                    <span className="font-syne text-heading text-base font-bold">
                      {fmt(data.availableBalance)}
                    </span>
                  </div>
                  {withdrawError && (
                    <p className="text-sm font-medium text-red-600">
                      {withdrawError}
                    </p>
                  )}
                  <NumberInputField
                    label="Amount"
                    min={1}
                    max={data.availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                  />
                  <TextInputField
                    label="Reason (optional)"
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    placeholder="e.g. Cashing out"
                  />
                  <div className="flex gap-3">
                    <SubmitButton
                      variant="secondary"
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </SubmitButton>
                    <SubmitButton
                      variant="primary"
                      loading={withdrawing}
                      loadingText="Processing..."
                      className="flex-1"
                    >
                      Withdraw
                    </SubmitButton>
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
