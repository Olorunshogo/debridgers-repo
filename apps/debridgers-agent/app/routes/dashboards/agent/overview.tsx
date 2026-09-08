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
import { HeroGreetingCard } from "@debridgers/ui-web";
import {
  formatFromKobo,
  useAsyncResource,
  AsyncBoundary,
  useAuth,
  useRatingAggregate,
  RatingSummary,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Agent Overview | Debridgers",
    description:
      "Your agent dashboard — view your sales, commissions, deliveries and performance summary.",
    path: "/overview",
    noIndex: true,
  });
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

  /*
   * GET /agent/dashboard returns total_earned / commission_pending as kobo strings, not naira.
   * The backend contract should return kobo ints; until it does, parse as an integer number of kobo and format from there.
   */
  const fmtKobo = (val: string | number): string => {
    const kobo = typeof val === "string" ? parseInt(val, 10) : Math.round(val);
    return formatFromKobo(Number.isFinite(kobo) ? kobo : 0);
  };

  const pendingKobo = parseInt(stats.commission_pending, 10);

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
    weekEarning: fmtKobo(stats.total_earned),
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
        value: fmtKobo(stats.total_earned),
        icon: "lucide:banknote",
        trend: `${fmtKobo(stats.commission_pending)} pending`,
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
      amountPending: pendingKobo > 0 ? fmtKobo(pendingKobo) : "₦0",
      weekProgress: new Date().getDay() || 7,
      weekLabel: `${nextFriday.daysLeft} day${nextFriday.daysLeft !== 1 ? "s" : ""} until payout`,
    },
  };
}

// === Status styles
const checklistStyles: Record<
  ChecklistStatus,
  { bgClass: string; labelClass: string; strikethrough: boolean }
> = {
  done: {
    bgClass: "bg-status-delivered",
    labelClass: "text-status-delivered-fg",
    strikethrough: true,
  },
  action: {
    bgClass: "bg-status-pending",
    labelClass: "text-status-pending-fg",
    strikethrough: false,
  },
  pending: {
    bgClass: "bg-light-bg",
    labelClass: "text-body",
    strikethrough: false,
  },
  request: {
    bgClass: "bg-light-bg",
    labelClass: "text-body",
    strikethrough: false,
  },
};

const rankBadge: Record<number, { bgClass: string; colorClass: string }> = {
  1: { bgClass: "bg-amber-100", colorClass: "text-amber-800" },
  2: { bgClass: "bg-gray-100", colorClass: "text-gray-700" },
  3: { bgClass: "bg-red-100", colorClass: "text-red-800" },
};

// === Stat card
function StatCard({ stat, index }: { stat: AgentStatCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-body text-sm">{stat.label}</span>
        <span className="bg-light-bg flex h-8 w-8 items-center justify-center rounded-full">
          <Icon icon={stat.icon} className="text-primary h-4 w-4" />
        </span>
      </div>
      <p className="font-syne text-heading text-2xl font-bold">{stat.value}</p>
      <p className="text-primary flex items-center gap-1 text-xs">
        <ArrowUpRight size={12} />
        {stat.trend}
      </p>
    </motion.div>
  );
}

// === Page
export default function AgentOverviewPage() {
  const { data, error, loading, refetch } = useAsyncResource<AgentDashData>(
    async (signal: AbortSignal): Promise<AgentDashData> => {
      const [profile, stats, leaderboard] = await Promise.all([
        apiFetch<ApiProfile>("/agent/me", { signal }),
        apiFetch<ApiDashStats>("/agent/dashboard", { signal }),
        apiFetch<ApiLeaderEntry[]>("/agent/leaderboard", { signal }),
      ]);
      return mapToDashboard(profile, stats, leaderboard.slice(0, 3));
    },
    [],
  );

  const skeleton = (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="bg-line h-40 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-line h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );

  return (
    <AsyncBoundary
      loading={loading || !data}
      error={error}
      onRetry={refetch}
      skeleton={skeleton}
    >
      {data ? <AgentOverviewContent data={data} /> : null}
    </AsyncBoundary>
  );
}

function AgentOverviewContent({ data }: { data: AgentDashData }) {
  const { user } = useAuth();
  const { aggregate, loading: ratingLoading } = useRatingAggregate(
    "agent",
    user?.sub ?? null,
  );

  return (
    <div className="flex flex-col gap-6">
      <HeroGreetingCard
        greeting={data.greeting}
        userName={data.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>📍 {data.location}</span>
            {data.ninVerified && (
              <span className="bg-status-active text-status-active-fg rounded-full px-2 py-0.5 text-xs font-semibold">
                NIN Verified ✓
              </span>
            )}
          </div>
        }
        actions={
          <>
            <Link
              to="/agent-dashboard/daily-report"
              className="bg-secondary text-heading inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
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
            <div className="flex min-w-35 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs text-white/60">Total earned</p>
              <p className="font-syne text-xl font-bold text-white">
                {data.weekEarning}
              </p>
              <p className="text-xs text-white/60">{data.paymentCycle}</p>
            </div>
            <div className="flex min-w-32.5 flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4">
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

      {!ratingLoading && aggregate && (
        <div className="border-line rounded-2xl border bg-white p-4">
          <p className="text-body mb-3 text-xs font-semibold tracking-wide uppercase">
            Rated by buyers
          </p>
          <RatingSummary data={aggregate} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
            Today&apos;s checklist
          </h3>
          <div className="flex flex-col gap-2">
            {data.checklist.map((item) => {
              const s = checklistStyles[item.status];
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.bgClass}`}
                >
                  <p
                    className={`text-heading text-sm ${s.strikethrough ? "line-through opacity-60" : ""}`}
                  >
                    {s.strikethrough && "✅ "}
                    {item.label}
                  </p>
                  <span
                    className={`ml-4 shrink-0 text-sm font-medium ${s.labelClass}`}
                  >
                    {item.actionLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-syne text-heading font-semibold">
              Leaderboard
            </h3>
            <a
              href="/agent-dashboard/leaderboard"
              className="text-primary text-xs font-medium underline underline-offset-2"
            >
              Full Board
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {data.leaderboard.map((entry) => {
              const badge = rankBadge[entry.rank] ?? {
                bgClass: "bg-light-bg",
                colorClass: "text-body",
              };
              return (
                <div
                  key={entry.rank}
                  className="bg-light-bg flex items-center gap-3 rounded-xl px-3 py-3"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge.bgClass} ${badge.colorClass}`}
                  >
                    #{entry.rank}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <p className="text-heading truncate text-sm font-semibold">
                      {entry.name}
                    </p>
                    <p className="text-body truncate text-xs">
                      {entry.location}
                    </p>
                  </div>
                  <span className="text-heading ml-auto shrink-0 text-sm font-semibold">
                    {entry.bags} bags
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-primary flex flex-col gap-3 rounded-2xl p-5"
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
              <p className="text-secondary text-sm font-semibold">₦0 pending</p>
            </>
          ) : (
            <>
              <p className="text-xs text-white/60">Next Payout in</p>
              <p className="font-syne text-4xl font-extrabold text-white">
                {data.nextPayout.daysLeft} Days
              </p>
              <p className="text-xs text-white/70">{data.nextPayout.date}</p>
              <p className="text-secondary text-sm font-semibold">
                {data.nextPayout.amountPending} pending
              </p>
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="relative h-1.5 w-full rounded-full bg-white/20">
                  <div
                    className="bg-secondary absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${(data.nextPayout.weekProgress / 7) * 100}%`,
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
