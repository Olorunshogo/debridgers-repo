import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Link } from "react-router";
import { apiFetch } from "@debridgers/api-client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { HeroGreetingCard } from "../shared/HeroGreetingCard";

export function meta() {
  return [
    { title: "Agent Overview | Debridgers" },
    {
      name: "description",
      content:
        "Your agent dashboard — view your sales, commissions, deliveries and performance summary.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Types
interface AgentStatCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
}

type ChecklistStatus = "done" | "pending" | "action" | "request";

interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  actionLabel: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  location: string;
  bags: number;
}

interface MonthlySales {
  month: string;
  bags: number;
}

interface AgentDashData {
  name: string;
  location: string;
  ninVerified: boolean;
  greeting: string;
  weekEarning: string;
  bagsInHand: number;
  bagsSold: number;
  bagsRemaining: number;
  paymentCycle: string;
  stats: AgentStatCard[];
  checklist: ChecklistItem[];
  leaderboard: LeaderboardEntry[];
  monthlySales: MonthlySales[];
  nextPayout: {
    daysLeft: number;
    date: string;
    amountPending: string;
    weekProgress: number;
    weekLabel: string;
  };
}

interface ApiProfile {
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  address?: string | null;
  total_earnings: string;
}

interface ApiDashStats {
  total_bags_sold: number;
  total_earned: string;
  rank: number | null;
  days_reported: number;
  commission_pending: string;
}

interface ApiLeaderEntry {
  rank: number;
  name: string;
  location: string;
  bags_sold: number;
}

function mapToDashboard(
  profile: ApiProfile,
  stats: ApiDashStats,
  leaderTop3: ApiLeaderEntry[],
): AgentDashData {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? "Good Morning 🌤"
      : hour < 17
        ? "Good Afternoon ☀️"
        : "Good Evening 🌙";

  const fmtNaira = (val: string | number) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const pendingNaira = parseFloat(stats.commission_pending);

  const nextFriday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return {
      daysLeft: diff,
      label: d.toLocaleDateString("en-NG", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  })();

  return {
    name: `${profile.first_name} ${profile.last_name}`.trim(),
    location: profile.address ?? "Unknown",
    ninVerified: profile.status === "approved",
    greeting,
    weekEarning: fmtNaira(stats.total_earned),
    bagsInHand: 0,
    bagsSold: stats.total_bags_sold,
    bagsRemaining: 0,
    paymentCycle: "Paid every Friday",
    stats: [
      {
        label: "Total bags sold",
        value: String(stats.total_bags_sold),
        icon: "lucide:shopping-bag",
        trend: "All time",
      },
      {
        label: "Total earned",
        value: fmtNaira(stats.total_earned),
        icon: "lucide:banknote",
        trend: `${fmtNaira(stats.commission_pending)} pending`,
      },
      {
        label: "Current rank",
        value: stats.rank != null ? String(stats.rank).padStart(2, "0") : "-",
        icon: "lucide:trophy",
        trend: "Overall",
      },
      {
        label: "Days reported",
        value: String(stats.days_reported),
        icon: "lucide:calendar-check",
        trend: "↑ Report today",
      },
    ],
    checklist: [
      {
        id: "c1",
        label: "Submit daily report",
        status: "action",
        actionLabel: "Do it →",
      },
      {
        id: "c2",
        label: "Request next batch of stock",
        status: "request",
        actionLabel: "Request →",
      },
    ],
    leaderboard: leaderTop3.map((e) => ({
      rank: e.rank,
      name: e.name,
      location: e.location,
      bags: e.bags_sold,
    })),
    monthlySales: [],
    nextPayout: {
      daysLeft: nextFriday.daysLeft,
      date: nextFriday.label,
      amountPending: pendingNaira > 0 ? fmtNaira(pendingNaira) : "₦0",
      weekProgress: new Date().getDay() || 7,
      weekLabel: `${nextFriday.daysLeft} day${nextFriday.daysLeft !== 1 ? "s" : ""} until payout`,
    },
  };
}

// === Status styles
const checklistStyles: Record<
  ChecklistStatus,
  { bg: string; labelColor: string; strikethrough: boolean }
> = {
  done: {
    bg: "var(--status-delivered-bg)",
    labelColor: "var(--status-delivered-text)",
    strikethrough: true,
  },
  action: {
    bg: "var(--status-pending-bg)",
    labelColor: "var(--status-pending-text)",
    strikethrough: false,
  },
  pending: {
    bg: "var(--bg-light)",
    labelColor: "var(--text-colour)",
    strikethrough: false,
  },
  request: {
    bg: "var(--bg-light)",
    labelColor: "var(--text-colour)",
    strikethrough: false,
  },
};

const rankBadge: Record<number, { bg: string; color: string }> = {
  1: { bg: "#FEF3C7", color: "#92400E" },
  2: { bg: "#F3F4F6", color: "#374151" },
  3: { bg: "#FEE2E2", color: "#991B1B" },
};

// === Stat card
function StatCard({ stat, index }: { stat: AgentStatCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="flex flex-col gap-3 rounded-2xl border p-4"
      style={{
        borderColor: "var(--border-gray)",
        backgroundColor: "var(--white)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--text-colour)" }}>
          {stat.label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--bg-light)" }}
        >
          <Icon
            icon={stat.icon}
            className="h-4 w-4"
            style={{ color: "var(--primary-color)" }}
          />
        </span>
      </div>
      <p
        className="font-syne text-2xl font-bold"
        style={{ color: "var(--heading-colour)" }}
      >
        {stat.value}
      </p>
      <p
        className="flex items-center gap-1 text-xs"
        style={{ color: "var(--primary-color)" }}
      >
        <ArrowUpRight size={12} />
        {stat.trend}
      </p>
    </motion.div>
  );
}

// === Page
export default function AgentOverviewPage() {
  const [data, setData] = useState<AgentDashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<ApiProfile>("/agent/me"),
      apiFetch<ApiDashStats>("/agent/dashboard"),
      apiFetch<ApiLeaderEntry[]>("/agent/leaderboard"),
    ])
      .then(([profile, stats, leaderboard]) => {
        setData(mapToDashboard(profile, stats, leaderboard.slice(0, 3)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div
          className="h-40 rounded-2xl"
          style={{ backgroundColor: "var(--border-gray)" }}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl"
              style={{ backgroundColor: "var(--border-gray)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <HeroGreetingCard
        greeting={data.greeting}
        userName={data.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>📍 {data.location}</span>
            {data.ninVerified && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--status-active-bg)",
                  color: "var(--status-active-text)",
                }}
              >
                NIN Verified ✓
              </span>
            )}
          </div>
        }
        actions={
          <>
            <Link
              to="/agent-dashboard/daily-report"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--secondary-color)",
                color: "var(--heading-colour)",
              }}
            >
              <Icon icon="lucide:clipboard-pen-line" className="h-4 w-4" />
              Submit today&apos;s report
            </Link>
            <Link
              to="/agent-dashboard/leaderboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              View leader board →
            </Link>
          </>
        }
        infoBox={
          <>
            <div
              className="flex min-w-35 flex-col gap-1 rounded-xl border border-white/20 p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs text-white/60">This week earning</p>
              <p className="font-syne text-xl font-bold text-white">
                {data.weekEarning}
              </p>
              <p className="text-xs text-white/60">{data.paymentCycle}</p>
            </div>
            <div
              className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs text-white/60">Bags in hand</p>
              <p className="font-syne text-xl font-bold text-white">
                {data.bagsInHand} bags
              </p>
              <p className="text-xs text-white/60">
                {data.bagsSold} sold · {data.bagsRemaining} remaining
              </p>
            </div>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Checklist + Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Checklist */}
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
            Today&apos;s checklist
          </h3>
          <div className="flex flex-col gap-2">
            {data.checklist.map((item) => {
              const s = checklistStyles[item.status];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ backgroundColor: s.bg }}
                >
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--heading-colour)",
                      textDecoration: s.strikethrough ? "line-through" : "none",
                      opacity: s.strikethrough ? 0.6 : 1,
                    }}
                  >
                    {s.strikethrough && "✅ "}
                    {item.label}
                  </p>
                  <span
                    className="ml-4 shrink-0 text-sm font-medium"
                    style={{ color: s.labelColor }}
                  >
                    {item.actionLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard preview */}
        <div
          className="flex flex-col gap-3 rounded-2xl border p-5"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <div className="flex items-center justify-between">
            <h3
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Today&apos;s checklist
            </h3>
            <a
              href="/agent-dashboard/leaderboard"
              className="text-xs font-medium underline underline-offset-2"
              style={{ color: "var(--primary-color)" }}
            >
              Full Board
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {data.leaderboard.map((entry) => {
              const badge = rankBadge[entry.rank] ?? {
                bg: "var(--bg-light)",
                color: "var(--text-colour)",
              };
              return (
                <div
                  key={entry.rank}
                  className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    #{entry.rank}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {entry.name}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {entry.location}
                    </p>
                  </div>
                  <span
                    className="ml-auto shrink-0 text-sm font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {entry.bags} bags
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart + Next payout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Bags sold chart */}
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
            Bag sold - this week
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={data.monthlySales}
              layout="vertical"
              barSize={14}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--text-colour)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}k`}
              />
              <YAxis
                type="category"
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--text-colour)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                formatter={(v: number) => [`${v} bags`, "Sold"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border-gray)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="bags" radius={[0, 4, 4, 0]}>
                {data.monthlySales.map((entry, i) => (
                  <Cell
                    key={entry.month}
                    fill={
                      i === data.monthlySales.length - 1
                        ? "var(--primary-color)"
                        : "var(--border-gray)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Next payout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col gap-3 rounded-2xl p-5"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          {data.nextPayout.amountPending === "₦0" ? (
            <>
              <p className="text-xs text-white/60">Next Payout</p>
              <p className="font-syne text-2xl font-extrabold text-white">
                No pending earnings
              </p>
              <p className="text-xs text-white/70">
                Sell stock to earn your first commission
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--secondary-color)" }}
              >
                ₦0 pending
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-white/60">Next Payout in</p>
              <p className="font-syne text-4xl font-extrabold text-white">
                {data.nextPayout.daysLeft} Days
              </p>
              <p className="text-xs text-white/70">{data.nextPayout.date}</p>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--secondary-color)" }}
              >
                {data.nextPayout.amountPending} pending
              </p>
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="relative h-1.5 w-full rounded-full bg-white/20">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${(data.nextPayout.weekProgress / 7) * 100}%`,
                      backgroundColor: "var(--secondary-color)",
                    }}
                  />
                </div>
                <p className="text-xs text-white/60">
                  {data.nextPayout.weekLabel}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
