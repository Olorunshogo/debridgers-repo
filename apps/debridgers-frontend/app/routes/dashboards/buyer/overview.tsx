import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
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
import {
  useCart,
  LAST_ORDER_STORAGE_KEY,
  type CartItem,
} from "../../../features/cart";
import {
  formatFromKobo,
  formatCurrency,
  supportWhatsAppHref,
} from "@debridgers/ui-web";

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
  href?: string;
  onClick?: () => void;
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

/*
 * GET /buyer/spending returns one row per week of delivered orders over the
 * last six weeks, oldest first, with amounts in kobo.
 */
interface ApiSpendingWeek {
  week: string;
  amount_kobo: number;
  amount_naira: number;
}

/* One line of GET /buyer/orders/:id, used to rebuild the cart on repeat. */
interface LastOrderItem {
  product_id: number;
  name: string;
  unit: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
}

function buildSpending(rows: ApiSpendingWeek[]): DashboardData["spending"] {
  const weeks: SpendingWeek[] = rows.map((row) => ({
    week: row.week,
    amount: Math.round(row.amount_kobo / 100),
  }));

  if (weeks.length === 0) {
    return { weeks, thisWeek: "N/A", thisMonth: "N/A", avgPerWeek: "N/A" };
  }

  const total = weeks.reduce((sum, w) => sum + w.amount, 0);
  const thisWeek = weeks[weeks.length - 1].amount;

  /*
   * The API labels weeks as "Mon DD" with no year, so a true calendar month
   * cannot be derived from it. The last four buckets are used as the month.
   */
  const thisMonth = weeks.slice(-4).reduce((sum, w) => sum + w.amount, 0);

  return {
    weeks,
    thisWeek: formatCurrency(thisWeek),
    thisMonth: formatCurrency(thisMonth),
    avgPerWeek: formatCurrency(Math.round(total / weeks.length)),
  };
}

function mapApiToDashboard(
  api: ApiDashboard,
  spendingRows: ApiSpendingWeek[],
): DashboardData {
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
    amount: formatFromKobo(o.total_amount),
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
        value: formatFromKobo(api.stats.total_spent_kobo),
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
    spending: buildSpending(spendingRows),
  };
}

const staticQuickActions: QuickAction[] = [
  { label: "New Order", icon: ShoppingCart, href: "/buyer-dashboard/shop" },
  { label: "Add Funds", icon: Wallet, href: "/buyer-dashboard/wallet" },
  { label: "Get help", icon: Headphones, href: "/buyer-dashboard/help" },
];

const statusStyles: Record<
  RecentOrder["status"],
  { bgClass: string; textClass: string; label: string }
> = {
  "on-the-way": {
    bgClass: "bg-status-on-the-way-bg",
    textClass: "text-status-on-the-way-text",
    label: "On the way",
  },
  delivered: {
    bgClass: "bg-status-delivered-bg",
    textClass: "text-status-delivered-text",
    label: "✓ Delivered",
  },
  cancelled: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "✕ Cancelled",
  },
};

function StatCardItem({ stat }: { stat: StatCard }) {
  return (
    <div className="border-gray-border flex flex-col gap-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-text text-sm">{stat.label}</span>
        <span className="bg-bg-light flex h-8 w-8 items-center justify-center rounded-full">
          <Icon icon={stat.icon} className="text-primary h-4 w-4" />
        </span>
      </div>
      <p className="font-syne text-heading text-2xl font-bold">{stat.value}</p>
      <p className="text-primary flex items-center gap-1 text-xs">
        <ArrowUpRight size={12} />
        {stat.trend}
      </p>
    </div>
  );
}

function OrderRow({ order }: { order: RecentOrder }) {
  const s = statusStyles[order.status];
  return (
    <div className="hover:bg-dash-quick-action-hover flex items-center justify-between rounded-xl bg-white px-4 py-3 transition-colors duration-150">
      <div className="flex flex-col gap-0.5">
        <p className="text-heading text-sm font-semibold">{order.items}</p>
        <p className="text-text text-xs">
          {order.orderId} • {order.time}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-heading text-sm font-bold">{order.amount}</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bgClass} ${s.textClass}`}
        >
          {s.label}
        </span>
      </div>
    </div>
  );
}

export default function BuyerOverview() {
  const navigate = useNavigate();
  const { replaceItems } = useCart();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Server first, localStorage only as a fallback.
   *
   * This used to read the snapshot alone, which is written at checkout and so
   * only exists in the browser the order was placed from. On a new device, or
   * after clearing storage, the button silently navigated to an empty shop and
   * looked broken. The buyer's real order history is on the server, so ask it.
   */
  async function repeatLastOrder(): Promise<void> {
    try {
      const orders = await apiFetch<{ id: number }[]>("/buyer/orders");

      if (orders.length > 0) {
        /* The list comes back newest first, so the head is the last order. */
        const detail = await apiFetch<{ items: LastOrderItem[] }>(
          `/buyer/orders/${orders[0].id}`,
        );

        const items: CartItem[] = detail.items.map((item) => ({
          id: String(item.product_id),
          name: item.name,
          price: item.unit_price / 100,
          unit: item.unit,
          image_url: item.image_url,
          qty: item.qty,
        }));

        if (items.length > 0) {
          replaceItems(items);
          navigate("/buyer-dashboard/shop");
          return;
        }
      }
    } catch {
      /* Offline or the call failed - fall through to the local snapshot. */
    }

    const last = localStorage.getItem(LAST_ORDER_STORAGE_KEY);
    if (last) {
      try {
        replaceItems(JSON.parse(last) as CartItem[]);
      } catch {
        /* corrupt snapshot - go to the shop with the cart untouched */
      }
    }

    navigate("/buyer-dashboard/shop");
  }

  useEffect(() => {
    Promise.all([
      apiFetch<ApiDashboard>("/buyer/dashboard"),
      // The chart is secondary to the rest of the page, so a failure here
      // leaves the dashboard usable with an empty chart rather than blank.
      apiFetch<ApiSpendingWeek[]>("/buyer/spending").catch(() => []),
    ])
      .then(([api, spendingRows]) =>
        setData(mapApiToDashboard(api, spendingRows)),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="border-gray-border h-40 rounded-2xl border" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-gray-border h-28 rounded-2xl border"
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
              href={supportWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary text-heading inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
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
          <div className="flex flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-4 lg:min-w-50">
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
        <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-syne text-heading font-semibold">
              Recent Order
            </h3>
            <Link
              to="/buyer-dashboard/orders"
              className="text-primary text-sm font-medium underline underline-offset-2"
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
          {[
            ...staticQuickActions.slice(0, 1),
            {
              label: "Repeat Last",
              icon: RefreshCcw,
              onClick: repeatLastOrder,
            },
            ...staticQuickActions.slice(1),
          ].map((action) => {
            const tileClass =
              "border-gray-border hover:border-primary hover:bg-dash-quick-action-hover flex w-full flex-col items-center gap-2 rounded-2xl border bg-white p-4 text-center transition-colors duration-200 cursor-pointer";
            const inner = (
              <>
                <action.icon size={22} className="text-primary" />
                <span className="text-heading text-xs font-medium">
                  {action.label}
                </span>
              </>
            );
            return (
              <motion.div
                key={action.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {action.onClick ? (
                  <button onClick={action.onClick} className={tileClass}>
                    {inner}
                  </button>
                ) : (
                  <Link to={action.href ?? "#"} className={tileClass}>
                    {inner}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Live tracking */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-primary rounded-2xl p-6"
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
              <span className="bg-status-active-bg text-status-active-text rounded-full px-2.5 py-1 text-xs font-medium">
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
                className="bg-secondary absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(data.tracking.steps.filter((s) => s.done).length / data.tracking.steps.length) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {data.tracking.steps.map((step) => (
                <div key={step.label} className="flex items-center gap-1">
                  <span
                    className={`text-xs ${step.done ? "text-secondary" : "text-white/40"}`}
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
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
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
              className="bg-secondary text-heading mt-1 rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            >
              Place an order
            </Link>
          </div>
        )}
      </motion.div>

      {/* Spending chart */}
      <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-syne text-heading font-semibold">
            Spending - Last 6 Weeks
          </h3>
          <span className="bg-bg-light text-text rounded-full px-3 py-1 text-xs font-medium">
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
              formatter={(v: number) => [formatCurrency(v), "Spent"]}
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

        <div className="border-gray-border grid grid-cols-3 gap-4 border-t pt-4">
          {[
            { label: "This week", value: data.spending.thisWeek },
            { label: "This month", value: data.spending.thisMonth },
            { label: "Avg / week", value: data.spending.avgPerWeek },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <p className="text-text text-xs">{s.label}</p>
              <p className="font-syne text-heading text-lg font-bold">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
