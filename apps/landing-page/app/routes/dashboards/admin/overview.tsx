import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Users, UserCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { BASE_BACKEND_URL } from "../../../utils/api";

export function meta() {
  return [{ title: "Admin Overview | Debridgers" }];
}

interface AdminStats {
  totalAgents: number;
  pendingAgents: number;
  totalBuyers: number;
  totalRevenue: string;
}

const MOCK: AdminStats = {
  totalAgents: 12,
  pendingAgents: 3,
  totalBuyers: 48,
  totalRevenue: "N1,240,000",
};

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // -- PRODUCTION --
    // fetch(`${BASE_BACKEND_URL}/admin/stats`, { credentials: "include" })
    //   .then((r) => r.json())
    //   .then((json) => setStats(json.data))
    //   .finally(() => setLoading(false));
    const t = setTimeout(() => {
      setStats(MOCK);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl"
            style={{ backgroundColor: "var(--border-gray)" }}
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Agents",
      value: stats.totalAgents,
      icon: UserCheck,
      href: "/admin-dashboard/agents",
    },
    {
      label: "Pending Approval",
      value: stats.pendingAgents,
      icon: Users,
      href: "/admin-dashboard/agents",
    },
    {
      label: "Total Buyers",
      value: stats.totalBuyers,
      icon: ShoppingBag,
      href: "/admin-dashboard/buyers",
    },
    {
      label: "Total Revenue",
      value: stats.totalRevenue,
      icon: TrendingUp,
      href: "/admin-dashboard",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link
              to={c.href}
              className="flex flex-col gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-md"
              style={{
                borderColor: "var(--border-gray)",
                backgroundColor: "var(--white)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: "var(--text-colour)" }}
                >
                  {c.label}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <c.icon size={16} style={{ color: "var(--primary-color)" }} />
                </span>
              </div>
              <p
                className="font-syne text-2xl font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                {c.value}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <h3
          className="font-syne mb-4 font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin-dashboard/agents"
            className="hover:bg-bg-light rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-gray)",
              color: "var(--heading-colour)",
            }}
          >
            Review Pending Agents
          </Link>
          <Link
            to="/admin-dashboard/buyers"
            className="hover:bg-bg-light rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-gray)",
              color: "var(--heading-colour)",
            }}
          >
            View All Buyers
          </Link>
        </div>
      </div>
    </div>
  );
}
