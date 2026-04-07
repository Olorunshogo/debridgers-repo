import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { TrendingUp, FileText, Wallet, Target } from "lucide-react";
import { PrimaryButton } from "@debridgers/ui-web";

export function meta() {
  return [{ title: "Agent Overview | Debridgers" }];
}

interface RecentReport {
  id: string;
  pagesSold: number;
  amount: string;
  commission: string;
  date: string;
}

interface AgentDashData {
  name: string;
  status: string;
  target: number;
  totalEarnings: string;
  pendingCommission: string;
  salesThisMonth: number;
  recentReports: RecentReport[];
}

const MOCK: AgentDashData = {
  name: "Amina Yusuf",
  status: "approved",
  target: 20,
  totalEarnings: "₦45,000",
  pendingCommission: "₦22,500",
  salesThisMonth: 8,
  recentReports: [
    {
      id: "1",
      pagesSold: 5,
      amount: "₦75,000",
      commission: "₦22,500",
      date: "Apr 2, 2026",
    },
    {
      id: "2",
      pagesSold: 3,
      amount: "₦45,000",
      commission: "₦13,500",
      date: "Apr 1, 2026",
    },
    {
      id: "3",
      pagesSold: 4,
      amount: "₦60,000",
      commission: "₦18,000",
      date: "Mar 31, 2026",
    },
  ],
};

function statCards(d: AgentDashData) {
  return [
    {
      label: "Total Earnings",
      value: d.totalEarnings,
      icon: Wallet,
      trend: "All time",
    },
    {
      label: "Sales Target",
      value: `${d.salesThisMonth}/${d.target}`,
      icon: Target,
      trend: "This month",
    },
    {
      label: "Pending Commission",
      value: d.pendingCommission,
      icon: TrendingUp,
      trend: "Awaiting payment",
    },
    {
      label: "Reports Filed",
      value: String(d.recentReports.length),
      icon: FileText,
      trend: "Recent",
    },
  ];
}

export default function AgentOverviewPage() {
  const [data, setData] = useState<AgentDashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // === PRODUCTION
    // fetch(`${BASE_BACKEND_URL}/agent/me`, { credentials: "include" })
    //   .then((r) => r.json())
    //   .then((json) => setData(json.data))
    //   .finally(() => setLoading(false));

    // === MOCK
    const t = setTimeout(() => {
      setData(MOCK);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div
          className="h-36 rounded-2xl"
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/70">Welcome back</p>
          <h2 className="font-syne text-2xl font-bold text-white lg:text-3xl">
            {data.name}
          </h2>
          <p className="text-sm text-white/70">
            Status:{" "}
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
              style={{
                backgroundColor: "var(--status-active-bg)",
                color: "var(--status-active-text)",
              }}
            >
              {data.status}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to="/agent-dashboard/reports"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--secondary-color)",
                color: "var(--heading-colour)",
              }}
            >
              <FileText size={15} />
              Submit Report
            </Link>
            <Link
              to="/agent-dashboard/commissions"
              className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              View commissions →
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full border-2 border-white/10" />
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards(data).map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex flex-col gap-3 rounded-2xl border p-4"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-colour)" }}>
                {s.label}
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--bg-light)" }}
              >
                <s.icon size={16} style={{ color: "var(--primary-color)" }} />
              </span>
            </div>
            <p
              className="font-syne text-2xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              {s.value}
            </p>
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              {s.trend}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent reports */}
      <div
        className="flex flex-col gap-4 rounded-2xl border p-5"
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
            Recent Reports
          </h3>
          <Link
            to="/agent-dashboard/reports"
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: "var(--primary-color)" }}
          >
            View All
          </Link>
        </div>
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border-gray)" }}
        >
          <div
            className="grid grid-cols-4 gap-4 border-b px-4 py-3 text-xs font-semibold tracking-wider uppercase"
            style={{
              borderColor: "var(--border-gray)",
              color: "var(--text-colour)",
            }}
          >
            <span>Date</span>
            <span>Pages Sold</span>
            <span>Amount</span>
            <span>Commission</span>
          </div>
          {data.recentReports.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-4 gap-4 border-b px-4 py-3 text-sm last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <span style={{ color: "var(--text-colour)" }}>{r.date}</span>
              <span style={{ color: "var(--heading-colour)" }}>
                {r.pagesSold}
              </span>
              <span style={{ color: "var(--heading-colour)" }}>{r.amount}</span>
              <span
                className="font-semibold"
                style={{ color: "var(--primary-color)" }}
              >
                {r.commission}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
