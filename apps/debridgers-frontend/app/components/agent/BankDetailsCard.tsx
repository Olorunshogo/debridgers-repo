import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, CheckCircle2, Pencil, ShieldCheck, X } from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";
import {
  DashSelectInput,
  DashTextInput,
  SubmitButton,
  fadeUpVariants,
  fadeDownVariants,
  transitionBase,
} from "@debridgers/ui-web";

/*
 * Payout bank details. Replaces the "contact admin" placeholder that used to sit
 * on the wallet page, which was the reason no agent could be paid: the account
 * number reached the database through KYC but the bank *code* never did, and a
 * transfer needs the code.
 *
 * The account name is never typed by the agent. They pick a bank, enter the
 * number, and the server resolves the name from the bank; they confirm that name
 * before anything is saved. A typo therefore shows up as the wrong person's name
 * rather than as money sent to a stranger.
 */

// === Types

interface BankOption {
  bankCode: string;
  name: string;
}

interface BankDetails {
  bank_name: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  is_complete: boolean;
}

interface ResolvedAccount {
  account_name: string;
  bank_name: string;
}

export interface BankDetailsCardProps {
  /*
   * Fires on first load and after every save, so the wallet page can gate its
   * payout button. It must fire on load too: gating on save alone would leave
   * an already-configured agent looking unconfigured until they re-saved.
   */
  onDetailsChange?: (details: BankDetails) => void;
}

export function BankDetailsCard({ onDetailsChange }: BankDetailsCardProps) {
  const [details, setDetails] = useState<BankDetails | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);

  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [resolved, setResolved] = useState<ResolvedAccount | null>(null);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  /*
   * Held in a ref so `load` can stay dependency-free. Taking the callback as a
   * dependency would refetch on every parent render unless the parent memoized
   * it, which is a trap for the next caller.
   */
  const onDetailsChangeRef = useRef(onDetailsChange);
  useEffect(() => {
    onDetailsChangeRef.current = onDetailsChange;
  }, [onDetailsChange]);

  // === Load

  const load = useCallback(async (): Promise<void> => {
    try {
      const [d, b] = await Promise.all([
        apiFetch<BankDetails>("/agent/bank-details"),
        apiFetch<BankOption[]>("/agent/banks"),
      ]);
      setDetails(d);
      setBanks(b);
      setBankCode(d.bank_code ?? "");
      setAccountNumber(d.bank_account_number ?? "");
      setError(null);
      onDetailsChangeRef.current?.(d);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your bank details. Reload the page to try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // === Actions

  /* Any edit invalidates a previously resolved name, so it must be re-verified. */
  function handleBankChange(value: string): void {
    setBankCode(value);
    setResolved(null);
    setError(null);
  }

  function handleAccountNumberChange(value: string): void {
    setAccountNumber(value.replace(/\D/g, "").slice(0, 10));
    setResolved(null);
    setError(null);
  }

  async function handleVerify(): Promise<void> {
    setVerifying(true);
    setError(null);
    try {
      const result = await apiFetch<ResolvedAccount>(
        "/agent/bank-details/resolve",
        {
          method: "POST",
          body: JSON.stringify({
            bank_code: bankCode,
            account_number: accountNumber,
          }),
        },
      );
      setResolved(result);
    } catch (err) {
      setResolved(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not verify that account. Check the number and try again.",
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<BankDetails>("/agent/bank-details", {
        method: "PATCH",
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      });
      setDetails(updated);
      setEditing(false);
      setResolved(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onDetailsChangeRef.current?.(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save your bank details. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(): void {
    setEditing(true);
    setResolved(null);
    setError(null);
    setBankCode(details?.bank_code ?? "");
    setAccountNumber(details?.bank_account_number ?? "");
  }

  function cancelEdit(): void {
    setEditing(false);
    setResolved(null);
    setError(null);
  }

  // === Derived

  const bankOptions = banks.map((b) => ({ value: b.bankCode, label: b.name }));
  const canVerify =
    bankCode.length >= 3 && accountNumber.length === 10 && !verifying;
  const accountNumberError =
    accountNumber.length > 0 && accountNumber.length < 10
      ? "Account number must be 10 digits"
      : undefined;

  if (loading) {
    return (
      <div className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-5">
        <div className="bg-gray-border h-5 w-32 animate-pulse rounded" />
        <div className="bg-gray-border h-10 w-full animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeUpVariants}
      initial="initial"
      animate="animate"
      transition={transitionBase}
      className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark size={18} className="text-primary" />
          <h3 className="font-syne text-heading font-semibold">Bank Details</h3>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-primary flex cursor-pointer items-center gap-1.5 text-sm font-semibold hover:underline"
          >
            <Pencil size={14} />
            {details?.is_complete ? "Update" : "Add bank account"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {saved && (
          <motion.p
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-delivered-bg text-status-delivered-text flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          >
            <CheckCircle2 size={16} /> Bank details saved.
          </motion.p>
        )}
        {error && (
          <motion.p
            variants={fadeDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionBase}
            className="bg-status-cancelled-bg text-status-cancelled-text flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError(null)}
              className="shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </motion.p>
        )}
      </AnimatePresence>

      {editing ? (
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DashSelectInput
              label="Bank"
              isBank
              placeholder="Select your bank"
              options={bankOptions}
              value={bankCode}
              onChange={(e) => handleBankChange(e.target.value)}
              required
            />
            <DashTextInput
              label="Account Number"
              placeholder="10 digits"
              inputMode="numeric"
              autoComplete="off"
              value={accountNumber}
              error={accountNumberError}
              onChange={(e) => handleAccountNumberChange(e.target.value)}
              required
            />
          </div>

          {/*
            Resolution is a separate, explicit step: the agent must see whose
            account this is before the details can be saved.
          */}
          {resolved ? (
            <div className="bg-status-delivered-bg flex flex-col gap-1 rounded-xl px-4 py-3">
              <span className="text-status-delivered-text flex items-center gap-2 text-xs font-semibold uppercase">
                <ShieldCheck size={14} /> Account verified
              </span>
              <p className="font-syne text-heading text-base font-bold break-words">
                {resolved.account_name}
              </p>
              <p className="text-text text-sm">
                {resolved.bank_name} - {accountNumber}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={!canVerify}
              className="border-primary text-primary w-full cursor-pointer rounded-full border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            >
              {verifying ? "Verifying..." : "Verify account"}
            </button>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <SubmitButton
              loading={saving}
              loadingText="Saving..."
              className="rounded-full sm:w-fit sm:px-8"
              disabled={!resolved}
            >
              Save bank details
            </SubmitButton>
            <button
              type="button"
              onClick={cancelEdit}
              className="border-gray-border text-text w-full cursor-pointer rounded-full border px-5 py-3 text-sm font-semibold transition-colors hover:bg-black/5 sm:w-fit"
            >
              Cancel
            </button>
          </div>

          {!resolved && (
            <p className="text-text text-xs">
              Verify the account before saving so we can confirm the name on it.
            </p>
          )}
        </form>
      ) : details?.is_complete ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-syne text-heading font-semibold break-words">
              {details.bank_account_name}
            </p>
            <p className="text-text text-sm break-words">
              {details.bank_name} - {details.bank_account_number}
            </p>
          </div>
          <span className="bg-status-delivered-bg text-status-delivered-text flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
            <CheckCircle2 size={13} /> Ready for payout
          </span>
        </div>
      ) : (
        <p className="text-text text-sm">
          Add your bank account to receive payouts. Payout requests stay blocked
          until this is set.
        </p>
      )}
    </motion.div>
  );
}

BankDetailsCard.displayName = "BankDetailsCard";
