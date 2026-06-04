import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Users, UserCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [{ title: "Admin Overview | Debridgers" }];
}

interface ApiAdminStats {
  total_agents: number;
  pending_agents: number;
  total_buyers: number;
  total_orders: number;
  total_revenue: string;
  pending_commissions: string;
  total_leads: number;
}

interface AdminStats {
  totalAgents: number;
  pendingAgents: number;
  totalBuyers: number;
  totalRevenue: string;
}

function mapStats(api: ApiAdminStats): AdminStats {
  const revenue = parseFloat(api.total_revenue);
  return {
    totalAgents: api.total_agents,
    pendingAgents: api.pending_agents,
    totalBuyers: api.total_buyers,
    totalRevenue: `₦${(revenue / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`,
  };
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ApiAdminStats>("/admin/dashboard")
      .then((api) => setStats(mapStats(api)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

  const cards = stats
    ? [
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
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {stats ? (
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
                    <c.icon
                      size={16}
                      style={{ color: "var(--primary-color)" }}
                    />
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
      ) : (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Stats unavailable. The admin API is not yet connected.
          </p>
        </div>
      )}

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
            className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-gray)",
              color: "var(--heading-colour)",
            }}
          >
            Review Pending Agents
          </Link>
          <Link
            to="/admin-dashboard/buyers"
            className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
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
