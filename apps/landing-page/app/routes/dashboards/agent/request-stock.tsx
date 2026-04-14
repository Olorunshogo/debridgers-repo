import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { DashTextInput, DashNumberInput } from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "../../../utils/api";

export function meta() {
  return [{ title: "Request Stock | Debridgers" }];
}

// === Types
type FulfilledStatus = "fulfilled" | "pending";

interface PastRequest {
  id: string;
  description: string;
  date: string;
  status: FulfilledStatus;
}

// === Mock data
const MOCK_PAST_REQUESTS: PastRequest[] = [
  {
    id: "r1",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "fulfilled",
  },
  {
    id: "r2",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "fulfilled",
  },
  {
    id: "r3",
    description: "10 bags of beans",
    date: "Mar 26",
    status: "pending",
  },
];

const PRICE_PER_BAG = 10000;
const COMMISSION_PER_BAG = 0.01 * PRICE_PER_BAG;

const statusStyles: Record<
  FulfilledStatus,
  { bg: string; text: string; label: string }
> = {
  fulfilled: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "Fulfilled",
  },
  pending: {
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    label: "Pending",
  },
};

function fmt(n: number) {
  return "₦" + n.toLocaleString();
}

// === Verification page
function AgentVerificationPage({ onVerified }: { onVerified: () => void }) {
  const [fullName, setFullName] = useState("");
  const [nin, setNin] = useState("");
  const [loadingAgentVerification, setLoadingAgentVerification] =
    useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  async function handleAgentVerification() {
    if (!nin || nin.length !== 11) {
      setVerificationError("NIN must be exactly 11 digits");
      return;
    }
    setVerificationError("");
    setLoadingAgentVerification(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/verification/agents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, nin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string })?.message ??
            "Verification failed. Please try again.",
        );
      }
      setIsVerified(true);
    } catch (err) {
      setVerificationError(
        err instanceof Error ? err.message : "Verification failed.",
      );
    } finally {
      setLoadingAgentVerification(false);
    }
  }

  return (
    <div className="bg-primary flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex w-full max-w-[480px] flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl"
      >
        {/* Heading */}
        <div className="flex flex-col gap-1">
          <h2
            className="font-syne text-2xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Verify your identity
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Enter your NIN to request stock and receive payout
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Full Name */}
          <DashTextInput
            label="Full Name"
            required
            placeholder="Abdulkadir Musa Yusuf"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* NIN row */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-3">
              <DashNumberInput
                label="NIN"
                required
                placeholder="35439629349"
                maxLength={11}
                value={nin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setNin(val);
                  if (verificationError) setVerificationError("");
                }}
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleAgentVerification}
                disabled={loadingAgentVerification || isVerified}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: isVerified
                    ? "var(--status-active-bg)"
                    : "#DBEAFE",
                  color: isVerified ? "var(--status-active-text)" : "#1D4ED8",
                }}
              >
                {loadingAgentVerification ? (
                  <motion.span
                    className="flex items-center gap-1.5"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Verifying
                  </motion.span>
                ) : isVerified ? (
                  <>
                    <CheckCircle2 size={14} />
                    Verified
                  </>
                ) : (
                  "Verify"
                )}
              </button>
            </div>
            {verificationError && (
              <p className="text-error-red text-xs">{verificationError}</p>
            )}
          </div>

          {/* Submit & Enter Dashboard */}
          <button
            type="button"
            disabled={!isVerified}
            onClick={onVerified}
            className="font-syne mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            Submit &amp; Enter Dashboard →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// === Request Stock form
function RequestStockForm() {
  const [bags, setBags] = useState<number>(5);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    "12 Barnawa Close, off Rabah Road, Barnawa",
  );
  const [deliveryTime, setDeliveryTime] = useState<string>(
    "Morning (8am - 12pm)",
  );
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // === PRODUCTION
    // await fetch(`${BASE_BACKEND_URL}/agent/stock-request`, {
    //   method: "POST",
    //   credentials: "include",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ bags, deliveryAddress, deliveryTime }),
    // });
    await new Promise<void>((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const summaryItems = [
    { label: "Bags", value: String(bags) },
    { label: "Est. value", value: fmt(bags * PRICE_PER_BAG) },
    { label: "Commission", value: fmt(bags * COMMISSION_PER_BAG) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Left: form */}
      <div className="border-border-gray flex flex-col gap-6 rounded-2xl border bg-white p-6">
        <h3 className="font-syne text-heading text-lg font-semibold">
          Request new stock
        </h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                backgroundColor: "var(--status-delivered-bg)",
                color: "var(--status-delivered-text)",
              }}
            >
              <CheckCircle2 size={18} />
              Stock request submitted! Admin will review shortly.
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {/* Bag stepper */}
              <div className="flex flex-col items-center gap-3">
                <p className="font-syne text-heading text-base font-semibold">
                  How many bags do you need?
                </p>
                <p className="text-text text-sm">
                  Choose how many bags of beans to sell this week
                </p>
                <div
                  className="flex w-full max-w-[280px] items-center justify-between rounded-2xl px-6 py-4"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <button
                    type="button"
                    onClick={() => setBags((b) => Math.max(1, b - 1))}
                    className="text-icon-primary border-border-gray flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border bg-white transition-all duration-300 ease-in-out"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="font-syne text-3xl font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {bags}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      bags of beans
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBags((b) => b + 1)}
                    className="text-icon-primary border-border-gray flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border bg-white transition-all duration-300 ease-in-out"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div
                className="grid grid-cols-3 gap-4 rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-light)" }}
              >
                {summaryItems.map((col) => (
                  <div key={col.label} className="flex flex-col gap-0.5">
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {col.label}
                    </p>
                    <p
                      className="font-syne text-lg font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {col.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Delivery address */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--text-colour)" }}
                >
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                    color: "var(--heading-colour)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary-color)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-gray)";
                  }}
                />
              </div>

              {/* Delivery time */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--text-colour)" }}
                >
                  Preferred Delivery Time
                </label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                  style={{
                    borderColor: "var(--border-gray)",
                    backgroundColor: "var(--bg-light)",
                    color: "var(--heading-colour)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary-color)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-gray)";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                {loading ? "Submitting..." : "Submit Stock Request"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Right: past requests */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Past Requests
        </h3>
        <div className="flex flex-col gap-2">
          {MOCK_PAST_REQUESTS.map((req, i) => {
            const s = statusStyles[req.status];
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--bg-light)",
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {req.description}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {req.date}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === Page
export default function AgentRequestStockPage() {
  const [isAgentVerified, setIsAgentVerified] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${BASE_BACKEND_URL}/verification/agents`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { data?: { verified?: boolean } }) => {
        setIsAgentVerified(data?.data?.verified === true);
      })
      .catch(() => {
        setIsAgentVerified(false);
      });
  }, []);

  if (isAgentVerified === null) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div
          className="h-40 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
        <div
          className="h-64 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
      </div>
    );
  }

  if (!isAgentVerified) {
    return (
      <AgentVerificationPage onVerified={() => setIsAgentVerified(true)} />
    );
  }

  return <RequestStockForm />;
}
