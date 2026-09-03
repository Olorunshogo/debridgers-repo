import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Users, ShoppingBag, Truck } from "lucide-react";

export function meta() {
  return [
    { title: "Buyer Admin Overview | Debridgers" },
    {
      name: "description",
      content:
        "Buyer admin dashboard — manage buyers, track deliveries, and handle orders.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface BuyerAdminStats {
  total_buyers: number;
  active_buyers: number;
  pending_deliveries: number;
  total_orders: number;
}

export default function BuyerAdminOverview() {
  const [stats, setStats] = useState<BuyerAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Create dedicated /buyer-admin/dashboard endpoint
    // For now, use placeholder data
    setStats({
      total_buyers: 0,
      active_buyers: 0,
      pending_deliveries: 0,
      total_orders: 0,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-line h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const cards = stats
    ? [
        {
          label: "Total Buyers",
          value: stats.total_buyers,
          icon: Users,
          href: "/admin-dashboard/buyers",
        },
        {
          label: "Active Buyers",
          value: stats.active_buyers,
          icon: Users,
          href: "/admin-dashboard/buyers",
        },
        {
          label: "Pending Deliveries",
          value: stats.pending_deliveries,
          icon: Truck,
          href: "/admin-dashboard/buyer/deliveries",
        },
        {
          label: "Total Orders",
          value: stats.total_orders,
          icon: ShoppingBag,
          href: "/admin-dashboard/buyer/deliveries",
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
                className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body text-sm">{c.label}</span>
                  <span className="bg-light-bg flex h-8 w-8 items-center justify-center rounded-full">
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
        <div className="border-line rounded-2xl border bg-white p-10 text-center">
          <p className="text-body text-sm">
            Stats unavailable. Please try again later.
          </p>
        </div>
      )}

      <div className="border-line rounded-2xl border bg-white p-6">
        <h3 className="font-syne text-heading mb-4 font-semibold">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin-dashboard/buyers"
            className="border-line text-heading rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            Manage Buyers
          </Link>
          <Link
            to="/admin-dashboard/buyer/deliveries"
            className="border-line text-heading rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            Track Deliveries
          </Link>
        </div>
      </div>
    </div>
  );
}
