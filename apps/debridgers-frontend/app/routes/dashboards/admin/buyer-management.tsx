import { DashSearchInput } from "@debridgers/ui-web";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, Package, AlertCircle } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { useNavigate } from "react-router";

export function meta() {
  return [
    { title: "Buyer Management | Debridgers Admin" },
    {
      name: "description",
      content:
        "Manage Debridgers buyers. View profiles, deposits, orders, and suspend accounts.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type BuyerStatus = "active" | "suspended";

interface BuyerListItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: BuyerStatus;
  total_deposited: number;
  joined_at: string;
}

interface ApiBuyerListResponse {
  buyers: {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: "active" | "suspended";
    total_deposited: number;
    joined_at: string;
  }[];
  total: number;
}

const STATUS_BADGE: Record<
  BuyerStatus,
  { bgClass: string; textClass: string; label: string; icon: string }
> = {
  active: {
    bgClass: "bg-status-active",
    textClass: "text-status-active-fg",
    label: "Active",
    icon: "✓",
  },
  suspended: {
    bgClass: "bg-status-cancelled",
    textClass: "text-status-cancelled-fg",
    label: "Suspended",
    icon: "⊘",
  },
};

export default function BuyerManagement() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<BuyerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all");

  useEffect(() => {
    apiFetch<ApiBuyerListResponse>("/admin/buyers")
      .then((data) => setBuyers(data.buyers))
      .catch(() => setBuyers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      buyers.filter((b) => {
        const matchesSearch =
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && b.status === "active") ||
          (statusFilter === "suspended" && b.status === "suspended");
        return matchesSearch && matchesStatus;
      }),
    [buyers, search, statusFilter],
  );

  const stats = useMemo(
    () => ({
      total: buyers.length,
      active: buyers.filter((b) => b.status === "active").length,
      suspended: buyers.filter((b) => b.status === "suspended").length,
      totalDeposits: buyers.reduce((sum, b) => sum + b.total_deposited, 0),
    }),
    [buyers],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Buyer Management
            </h2>
            <p className="text-body text-sm">
              {loading ? "Loading..." : `${buyers.length} total buyers`}
            </p>
          </div>
        </div>

        <DashSearchInput
          placeholder="Search buyers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Buyers",
            value: stats.total,
            icon: Users,
            color: "text-blue-500",
          },
          {
            label: "Active",
            value: stats.active,
            icon: Package,
            color: "text-green-500",
          },
          {
            label: "Suspended",
            value: stats.suspended,
            icon: AlertCircle,
            color: "text-red-500",
          },
          {
            label: "Total Deposits",
            value: `₦${(stats.totalDeposits / 100).toLocaleString()}`,
            icon: Wallet,
            color: "text-amber-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="border-line flex items-start gap-3 rounded-2xl border bg-white p-4"
          >
            <stat.icon size={20} className={`${stat.color} mt-1`} />
            <div className="flex-1">
              <p className="text-body text-xs font-semibold tracking-wider uppercase">
                {stat.label}
              </p>
              <p className="font-syne text-heading text-lg font-bold">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "active", "suspended"].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter as typeof statusFilter)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all ${
              statusFilter === filter
                ? "bg-primary text-white"
                : "border-line text-body hover:bg-light-bg border bg-white"
            }`}
          >
            {filter === "all"
              ? "All"
              : filter === "active"
                ? "Active"
                : "Suspended"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border-line overflow-hidden rounded-2xl border bg-white">
        <div className="border-line text-body grid grid-cols-[1fr_1.2fr_100px_80px_80px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
          <span>Buyer</span>
          <span>Email</span>
          <span>Deposited</span>
          <span>Joined</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border-line h-14 animate-pulse border-b ${
                  i % 2 === 0 ? "bg-light-bg" : "bg-white"
                }`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-body px-5 py-8 text-center text-sm">
            {search
              ? "No buyers match your search."
              : "No buyers in this category."}
          </p>
        ) : (
          <AnimatePresence>
            {filtered.map((buyer, i) => {
              const badge = STATUS_BADGE[buyer.status];
              const joinedDate = new Date(buyer.joined_at).toLocaleDateString(
                "en-NG",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              );
              return (
                <motion.div
                  key={buyer.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-line hover:bg-light-bg grid cursor-pointer grid-cols-[1fr_1.2fr_100px_80px_80px] gap-4 border-b px-5 py-4 text-sm transition-colors last:border-0"
                  onClick={() =>
                    navigate(`/dashboards/admin/buyers/${buyer.id}`)
                  }
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-heading font-semibold">{buyer.name}</p>
                    <p className="text-body text-xs">ID: {buyer.id}</p>
                  </div>
                  <span className="text-body truncate text-xs">
                    {buyer.email}
                  </span>
                  <span className="text-heading font-semibold">
                    ₦{(buyer.total_deposited / 100).toLocaleString()}
                  </span>
                  <span className="text-body text-xs">{joinedDate}</span>
                  <span
                    className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.icon} {badge.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
