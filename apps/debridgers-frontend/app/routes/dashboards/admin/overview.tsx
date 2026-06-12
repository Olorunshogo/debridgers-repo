import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Users, UserCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Admin Overview | Debridgers" },
    {
      name: "description",
      content:
        "Admin dashboard overview — monitor agents, buyers, orders and revenue at a glance.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
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
          <div key={i} className="bg-gray-border h-28 rounded-2xl" />
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
                className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-text text-sm">{c.label}</span>
                  <span className="bg-bg-light flex h-8 w-8 items-center justify-center rounded-full">
                    <c.icon size={16} className="text-primary" />
                  </span>
                </div>
                <p className="font-syne text-heading text-2xl font-bold">
                  {c.value}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border-gray-border rounded-2xl border bg-white p-10 text-center">
          <p className="text-text text-sm">
            Stats unavailable. The admin API is not yet connected.
          </p>
        </div>
      )}

      <div className="border-gray-border rounded-2xl border bg-white p-6">
        <h3 className="font-syne text-heading mb-4 font-semibold">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin-dashboard/agents"
            className="border-gray-border text-heading rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            Review Pending Agents
          </Link>
          <Link
            to="/admin-dashboard/buyers"
            className="border-gray-border text-heading rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            View All Buyers
          </Link>
        </div>
      </div>
    </div>
  );
}
