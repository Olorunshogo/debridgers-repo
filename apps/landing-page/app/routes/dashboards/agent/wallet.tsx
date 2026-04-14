import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { YellowPrimaryLink } from "@debridgers/ui-web";

export function meta() {
  return [{ title: "Weekly Payout | Debridgers" }];
}

// === Config

/** Change to 6 for Saturday, 5 for Friday, etc. (0=Sun … 6=Sat) */
const PAYOUT_DAY_OF_WEEK = 5; // Friday

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

function getCurrentWeekLabel(): string {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(sunday)} – ${fmt(saturday)}`;
}

// === Types
type PayoutStatus = "pending" | "paid";

interface WeekBreakdown {
  id: string;
  weekLabel: string;
  bags: number;
  agentTarget: number;
  commission: string;
  bonus: string;
  total: string;
  status: PayoutStatus;
  isCurrent: boolean;
}

// === Mock data
const MOCK_BREAKDOWNS: WeekBreakdown[] = [
  {
    id: "w1",
    weekLabel: getCurrentWeekLabel(),
    bags: 7,
    agentTarget: 10,
    commission: "₦14,000",
    bonus: "₦4,400",
    total: "₦18,400",
    status: "pending",
    isCurrent: true,
  },
  {
    id: "w2",
    weekLabel: "Mar 21 – Mar 27",
    bags: 10,
    agentTarget: 10,
    commission: "₦14,000",
    bonus: "₦4,400",
    total: "₦18,400",
    status: "paid",
    isCurrent: false,
  },
  {
    id: "w3",
    weekLabel: "Mar 14 – Mar 20",
    bags: 8,
    agentTarget: 10,
    commission: "₦14,000",
    bonus: "₦4,400",
    total: "₦18,400",
    status: "paid",
    isCurrent: false,
  },
  {
    id: "w4",
    weekLabel: "Mar 7 – Mar 13",
    bags: 13,
    agentTarget: 10,
    commission: "₦14,000",
    bonus: "₦4,400",
    total: "₦18,400",
    status: "paid",
    isCurrent: false,
  },
  {
    id: "w5",
    weekLabel: "Feb 28 – Mar 6",
    bags: 9,
    agentTarget: 10,
    commission: "₦14,000",
    bonus: "₦4,400",
    total: "₦18,400",
    status: "paid",
    isCurrent: false,
  },
];

const STATUS_BADGE: Record<
  PayoutStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  paid: {
    bg: "var(--status-active-bg)",
    text: "var(--status-active-text)",
    label: "Paid",
  },
};

// === In-page: Week Breakdown Card
function WeekBreakdownCard({ week }: { week: WeekBreakdown }) {
  const badge = STATUS_BADGE[week.status];
  const progress = Math.min(week.bags / week.agentTarget, 1);

  const statCols = [
    { label: "Bags", value: String(week.bags), color: "var(--heading-colour)" },
    {
      label: "Commission",
      value: week.commission,
      color: "var(--heading-colour)",
    },
    { label: "Bonus", value: week.bonus, color: "var(--secondary-color)" },
    { label: "Total", value: week.total, color: "var(--heading-colour)" },
  ];

  return (
    <div className="border-border-gray flex flex-col gap-3 rounded-2xl border bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-syne text-heading text-sm font-semibold">
          This week ({week.weekLabel})
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {statCols.map((col) => (
          <div key={col.label} className="flex flex-col gap-0.5">
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              {col.label}
            </p>
            <p
              className="font-syne text-base font-bold"
              style={{ color: col.color }}
            >
              {col.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar — current week only */}
      {week.isCurrent && (
        <div className="flex flex-col gap-1">
          <div className="border-border-gray relative h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ backgroundColor: "var(--primary-color)" }}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-colour)" }}>
            {week.bags}/{week.agentTarget} bags sold this week
          </p>
        </div>
      )}
    </div>
  );
}

// === Page
export default function AgentWalletPage() {
  const nextPayoutDate = getNextPayoutDate();

  return (
    <div className="py-section-px flex flex-col gap-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-primary flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Left */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70">Total earning this week</p>
          <p className="font-syne text-4xl font-extrabold text-white">
            ₦18,400
          </p>
          <div className="flex flex-wrap gap-3">
            <YellowPrimaryLink
              to="/agent-dashboard/wallet"
              icon="lucide:wallet"
            >
              Request payout
            </YellowPrimaryLink>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-white/60 hover:text-white">
              <Wallet size={14} />
              Update bank details
            </button>
          </div>
        </div>

        {/* Right: payout date */}
        <div className="flex flex-col gap-1 sm:items-end">
          <p className="text-xs text-white/60">Automatic payout at</p>
          <p
            className="font-syne text-xl font-bold"
            style={{ color: "var(--secondary-color)" }}
          >
            {nextPayoutDate}
          </p>
          <p className="text-xs text-white/60">Every Friday 9am disbursement</p>
        </div>
      </motion.div>

      {/* Body */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Weekly breakdown */}
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
            Weekly breakdown
          </h3>
          <div className="flex flex-col gap-3">
            {MOCK_BREAKDOWNS.map((week, i) => (
              <motion.div
                key={week.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <WeekBreakdownCard week={week} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bank details */}
        <div className="flex flex-col gap-4">
          <h3
            className="font-syne font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Bank details
          </h3>
          <div
            className="flex flex-col gap-3 rounded-2xl p-5"
            style={{ backgroundColor: "var(--bg-light)" }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "var(--text-colour)" }}
            >
              Bank Account
            </p>
            <div className="flex flex-col gap-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                First Bank Nigeria
              </p>
              <p
                className="font-syne text-2xl font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                3047882109
              </p>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                Abdulkadir Musa Yusuf
              </p>
            </div>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "var(--status-active-bg)",
                color: "var(--status-active-text)",
              }}
            >
              ✓ Account verified · Payout goes here every Friday
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
