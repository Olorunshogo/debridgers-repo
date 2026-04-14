import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Search } from "lucide-react";

export function meta() {
  return [{ title: "Buyers | Debridgers Admin" }];
}

type BuyerStatus = "active" | "inactive";

interface BuyerRow {
  id: string;
  name: string;
  email: string;
  location: string;
  totalOrders: number;
  totalSpent: string;
  status: BuyerStatus;
  joinedDate: string;
}

const MOCK_BUYERS: BuyerRow[] = [
  {
    id: "b1",
    name: "Halima Suleiman",
    email: "halima@example.com",
    location: "Barnawa",
    totalOrders: 8,
    totalSpent: "₦96,000",
    status: "active",
    joinedDate: "Feb 5, 2026",
  },
  {
    id: "b2",
    name: "Musa Aliyu",
    email: "musa@example.com",
    location: "Kakuri",
    totalOrders: 5,
    totalSpent: "₦60,000",
    status: "active",
    joinedDate: "Feb 18, 2026",
  },
  {
    id: "b3",
    name: "Aisha Bello",
    email: "aisha@example.com",
    location: "Narayi",
    totalOrders: 12,
    totalSpent: "₦144,000",
    status: "active",
    joinedDate: "Jan 30, 2026",
  },
  {
    id: "b4",
    name: "Tunde Adeyemi",
    email: "tunde@example.com",
    location: "Zaria",
    totalOrders: 2,
    totalSpent: "₦24,000",
    status: "inactive",
    joinedDate: "Mar 10, 2026",
  },
  {
    id: "b5",
    name: "Ngozi Eze",
    email: "ngozi@example.com",
    location: "Kaduna South",
    totalOrders: 7,
    totalSpent: "₦84,000",
    status: "active",
    joinedDate: "Mar 1, 2026",
  },
];

const STATUS_BADGE: Record<
  BuyerStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "var(--status-active-bg)",
    text: "var(--status-active-text)",
    label: "Active",
  },
  inactive: {
    bg: "var(--bg-light)",
    text: "var(--text-colour)",
    label: "Inactive",
  },
};

export default function AdminBuyers() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_BUYERS.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag size={24} style={{ color: "var(--primary-color)" }} />
          <div>
            <h2
              className="font-syne text-xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Buyers
            </h2>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              {MOCK_BUYERS.length} registered buyers
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-full border px-4 py-2"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <Search size={15} style={{ color: "var(--text-colour)" }} />
          <input
            type="text"
            placeholder="Search buyers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--heading-colour)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_1fr_80px_110px_90px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Buyer</span>
          <span>Location</span>
          <span>Orders</span>
          <span>Total Spent</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {filtered.map((buyer, i) => {
          const badge = STATUS_BADGE[buyer.status];
          return (
            <motion.div
              key={buyer.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr_1fr_80px_110px_90px] gap-4 border-b px-5 py-4 text-sm last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <div className="flex flex-col gap-0.5">
                <p
                  className="font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {buyer.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                  {buyer.email}
                </p>
              </div>
              <span style={{ color: "var(--text-colour)" }}>
                {buyer.location}
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {buyer.totalOrders}
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--primary-color)" }}
              >
                {buyer.totalSpent}
              </span>
              <span
                className="w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <p
            className="px-5 py-8 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
            No buyers match your search.
          </p>
        )}
      </div>
    </div>
  );
}
