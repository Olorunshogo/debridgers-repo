import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  RefreshCcw,
  Wallet,
  Headphones,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import { HeroGreetingCard } from "../shared/HeroGreetingCard";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Overview | Debridgers" },
    {
      name: "description",
      content:
        "View your recent orders, spending and delivery activity from your Debridgers buyer dashboard.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface StatCard {
  label: string;
  value: string;
  trend: string;
  icon: string;
}

interface RecentOrder {
  id: string;
  items: string;
  orderId: string;
  time: string;
  amount: string;
  status: "on-the-way" | "delivered" | "cancelled";
}

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

interface TrackingStep {
  label: string;
  done: boolean;
}

interface SpendingWeek {
  week: string;
  amount: number;
}

interface DashboardData {
  userName: string;
  greeting: string;
  subtitle: string;
  nextDelivery: { time: string; orderId: string; itemCount: number };
  stats: StatCard[];
  recentOrders: RecentOrder[];
  tracking: {
    orderId: string;
    eta: string;
    steps: TrackingStep[];
    items: string[];
    hasOrder: boolean;
  };
  spending: {
    weeks: SpendingWeek[];
    thisWeek: string;
    thisMonth: string;
    avgPerWeek: string;
  };
}

interface ApiDashboard {
  user_name: string;
  greeting: string;
  stats: {
    total_orders: number;
    active_orders: number;
    total_spent_kobo: number;
    total_spent_naira: number;
  };
  recent_orders: Array<{
    id: number;
    status: string;
    total_amount: number;
    quantity: number;
    delivery_address: string;
    created_at: string;
  }>;
  next_delivery: {
    id: number;
    status: string;
    quantity: number;
    created_at: string;
  } | null;
}

function mapApiToDashboard(api: ApiDashboard): DashboardData {
  const formatKobo = (kobo: number) =>
    `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const dbStatusToUi = (s: string): RecentOrder["status"] => {
    if (s === "out_for_delivery" || s === "confirmed") return "on-the-way";
    if (s === "delivered") return "delivered";
    if (s === "cancelled") return "cancelled";
    return "on-the-way";
  };

  const recentOrders: RecentOrder[] = api.recent_orders.map((o) => ({
    id: String(o.id),
    items: `${o.quantity} pack${o.quantity !== 1 ? "s" : ""}`,
    orderId: `#DBR-${String(o.id).padStart(4, "0")}`,
    time: new Date(o.created_at).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    amount: formatKobo(o.total_amount),
    status: dbStatusToUi(o.status),
  }));

  const nd = api.next_delivery;
  const nextDelivery = nd
    ? {
        time: "In transit",
        orderId: `DBR-${String(nd.id).padStart(4, "0")}`,
        itemCount: nd.quantity,
      }
    : { time: "-", orderId: "-", itemCount: 0 };

  const trackingSteps: TrackingStep[] = nd
    ? [
        { label: "Ordered", done: true },
        { label: "Packed", done: nd.status !== "pending" },
        {
          label: "On route",
          done: nd.status === "out_for_delivery" || nd.status === "delivered",
        },
        { label: "Delivered", done: nd.status === "delivered" },
      ]
    : [
        { label: "Ordered", done: false },
        { label: "Packed", done: false },
        { label: "On route", done: false },
        { label: "Delivered", done: false },
      ];

  return {
    userName: api.user_name,
    greeting: api.greeting,
    subtitle: nd
      ? "Your next delivery is on the way. Track it below."
      : "No active deliveries right now. Place a new order!",
    nextDelivery,
    stats: [
      {
        label: "Total Order",
        value: String(api.stats.total_orders),
        trend: `${api.stats.total_orders} total`,
        icon: "lucide:shopping-bag",
      },
      {
        label: "Total Spent",
        value: formatKobo(api.stats.total_spent_kobo),
        trend: "All time",
        icon: "lucide:banknote",
      },
      {
        label: "Active Order",
        value: String(api.stats.active_orders).padStart(2, "0"),
        trend: `${api.stats.active_orders} in progress`,
        icon: "lucide:refresh-cw",
      },
      {
        label: "Money Saved",
        value: "-",
        trend: "Coming soon",
        icon: "lucide:piggy-bank",
      },
    ],
    recentOrders,
    tracking: {
      orderId: nd ? `DBR-${String(nd.id).padStart(4, "0")}` : "N/A",
      eta: "N/A",
      steps: trackingSteps,
      items: nd ? [`${nd.quantity} pack${nd.quantity !== 1 ? "s" : ""}`] : [],
      hasOrder: !!nd,
    },
    spending: {
      weeks: [],
      thisWeek: "N/A",
      thisMonth: "N/A",
      avgPerWeek: "N/A",
    },
  };
}

const quickActions: QuickAction[] = [
  { label: "New Order", icon: ShoppingCart, href: "/buyer-dashboard/shop" },
  { label: "Repeat Last", icon: RefreshCcw, href: "/buyer-dashboard/shop" },
  { label: "Add Funds", icon: Wallet, href: "/buyer-dashboard/wallet" },
  { label: "Get help", icon: Headphones, href: "https://wa.me/+2347012288798" },
];

const statusStyles: Record<
  RecentOrder["status"],
  { bg: string; text: string; label: string }
> = {
  "on-the-way": {
    bg: "var(--status-on-the-way-bg)",
    text: "var(--status-on-the-way-text)",
    label: "On the way",
  },
  delivered: {
    bg: "var(--status-delivered-bg)",
    text: "var(--status-delivered-text)",
    label: "✓ Delivered",
  },
  cancelled: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
    label: "✕ Cancelled",
  },
};

function StatCardItem({ stat }: { stat: StatCard }) {
  return (
    <div
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
    </div>
  );
}

function OrderRow({ order }: { order: RecentOrder }) {
  const s = statusStyles[order.status];
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors duration-150"
      style={{ backgroundColor: "var(--white)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--dash-quick-action-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--white)";
      }}
    >
      <div className="flex flex-col gap-0.5">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          {order.items}
        </p>
        <p className="text-xs" style={{ color: "var(--text-colour)" }}>
          {order.orderId} • {order.time}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p
          className="text-sm font-bold"
          style={{ color: "var(--heading-colour)" }}
        >
          {order.amount}
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: s.bg, color: s.text }}
        >
          {s.label}
        </span>
      </div>
    </div>
  );
}

export default function BuyerOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ApiDashboard>("/buyer/dashboard")
      .then((api) => setData(mapApiToDashboard(api)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="border-border-gray h-40 rounded-2xl border" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border-gray h-28 rounded-2xl border"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero greeting card */}
      <HeroGreetingCard
        greeting={data.greeting}
        userName={data.userName}
        subtitle={<p className="max-w-87.5">{data.subtitle}</p>}
        actions={
          <>
            <a
              href="https://chat.whatsapp.com/GjMvQOIbO9qAFjUGR3ZYVK?s=sw&p=i&mlu=2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--secondary-color)",
                color: "var(--heading-colour)",
              }}
            >
              <Icon icon="lucide:message-circle" className="h-4 w-4" />
              Order On WhatsApp
            </a>
            <Link
              to="/buyer-dashboard/shop"
              className="flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Browse catalog <ArrowRight size={16} />
            </Link>
          </>
        }
        infoBox={
          <div
            className="flex flex-col gap-1 rounded-xl border border-white/20 p-4 lg:min-w-50"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-xs text-white/60">Next Delivery</p>
            <p className="font-syne text-2xl font-bold text-white">
              {data.nextDelivery.time}
            </p>
            <p className="text-xs text-white/60">
              Order #{data.nextDelivery.orderId} · {data.nextDelivery.itemCount}{" "}
              items
            </p>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
          >
            <StatCardItem stat={stat} />
          </motion.div>
        ))}
      </div>

      {/* Recent orders + Quick actions */}
      <div className="grid grid-cols-1 gap-6">
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
              Recent Order
            </h3>
            <Link
              to="/buyer-dashboard/orders"
              className="text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--primary-color)" }}
            >
              View All
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {data.recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((action) => (
            <motion.div
              key={action.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                to={action.href}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors duration-200"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--white)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--dash-quick-action-hover)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--primary-color)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--white)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border-gray)";
                }}
              >
                <action.icon
                  size={22}
                  style={{ color: "var(--primary-color)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {action.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live tracking */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl p-6"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        {data.tracking.hasOrder ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">
                  Order #{data.tracking.orderId}
                </p>
                <p className="font-syne text-sm font-semibold text-white">
                  Live Tracking
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: "var(--status-active-bg)",
                  color: "var(--status-active-text)",
                }}
              >
                ● Active
              </span>
            </div>

            <div>
              <p className="text-xs text-white/60">Estimated arrival</p>
              <p className="font-syne text-3xl font-extrabold text-white">
                {data.tracking.eta}
              </p>
            </div>

            <div className="relative h-1.5 w-full rounded-full bg-white/20">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(data.tracking.steps.filter((s) => s.done).length / data.tracking.steps.length) * 100}%`,
                  backgroundColor: "var(--secondary-color)",
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {data.tracking.steps.map((step) => (
                <div key={step.label} className="flex items-center gap-1">
                  <span
                    className="text-xs"
                    style={{
                      color: step.done
                        ? "var(--secondary-color)"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {step.done ? "✓" : "○"}
                  </span>
                  <span className="text-xs text-white/70">{step.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <p className="w-full text-xs tracking-widest text-white/50 uppercase">
                Items in order
              </p>
              {data.tracking.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "white",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-syne text-sm font-semibold text-white">
              Live Tracking
            </p>
            <p className="text-sm text-white/60">No active orders right now.</p>
            <Link
              to="/buyer-dashboard/shop"
              className="mt-1 rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--secondary-color)",
                color: "var(--heading-colour)",
              }}
            >
              Place an order
            </Link>
          </div>
        )}
      </motion.div>

      {/* Spending chart */}
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
            Spending - Last 6 Weeks
          </h3>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: "var(--bg-light)",
              color: "var(--text-colour)",
            }}
          >
            This week ↑
          </span>
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.spending.weeks} barSize={20}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "var(--text-colour)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(v: number) => [`₦${v.toLocaleString()}`, "Spent"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border-gray)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.spending.weeks.map((entry, i) => (
                <Cell
                  key={entry.week}
                  fill={
                    i === data.spending.weeks.length - 1
                      ? "var(--primary-color)"
                      : "var(--border-gray)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div
          className="grid grid-cols-3 gap-4 border-t pt-4"
          style={{ borderColor: "var(--border-gray)" }}
        >
          {[
            { label: "This week", value: data.spending.thisWeek },
            { label: "This month", value: data.spending.thisMonth },
            { label: "Avg / week", value: data.spending.avgPerWeek },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                {s.label}
              </p>
              <p
                className="font-syne text-lg font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
