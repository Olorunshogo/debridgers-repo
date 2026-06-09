import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Search } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Buyers | Debridgers Admin" },
    {
      name: "description",
      content:
        "View and manage all Debridgers buyer accounts. Track orders, activity and account details.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type BuyerStatus = "active" | "inactive";

interface BuyerRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  status: BuyerStatus;
  joinedDate: string;
}

interface ApiBuyer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_email_verified: boolean;
  is_blocked: boolean;
  joined_at: string;
}

function mapBuyer(b: ApiBuyer): BuyerRow {
  return {
    id: b.id,
    name: `${b.first_name} ${b.last_name}`.trim(),
    email: b.email,
    phone: b.phone ?? "—",
    verified: b.is_email_verified,
    status: b.is_blocked ? "inactive" : "active",
    joinedDate: new Date(b.joined_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

const STATUS_BADGE: Record<
  BuyerStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  active: {
    bgClass: "bg-status-active-bg",
    textClass: "text-status-active-text",
    label: "Active",
  },
  inactive: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
    label: "Blocked",
  },
};

export default function AdminBuyers() {
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<ApiBuyer[]>("/admin/buyers")
      .then((rows) => setBuyers(rows.map(mapBuyer)))
      .catch(() => setBuyers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      buyers.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [buyers, search],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">Buyers</h2>
            <p className="text-text text-sm">
              {loading ? "Loading..." : `${buyers.length} registered buyers`}
            </p>
          </div>
        </div>

        <div className="border-gray-border flex items-center gap-2 rounded-full border bg-white px-4 py-2">
          <Search size={15} className="text-text" />
          <input
            type="text"
            placeholder="Search buyers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-heading w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-gray-border text-text grid grid-cols-[1fr_1fr_1fr_90px_80px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
          <span>Buyer</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Joined</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border-gray-border h-14 animate-pulse border-b ${i % 2 === 0 ? "bg-bg-light" : "bg-white"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text px-5 py-8 text-center text-sm">
            {search
              ? "No buyers match your search."
              : "No buyers registered yet."}
          </p>
        ) : (
          <AnimatePresence>
            {filtered.map((buyer, i) => {
              const badge = STATUS_BADGE[buyer.status];
              return (
                <motion.div
                  key={buyer.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-gray-border grid grid-cols-[1fr_1fr_1fr_90px_80px] gap-4 border-b px-5 py-4 text-sm last:border-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-heading font-semibold">{buyer.name}</p>
                    {buyer.verified && (
                      <p className="text-status-active-text text-xs">
                        ✓ Verified
                      </p>
                    )}
                  </div>
                  <span className="text-text truncate text-xs">
                    {buyer.email}
                  </span>
                  <span className="text-text">{buyer.phone}</span>
                  <span className="text-text text-xs">{buyer.joinedDate}</span>
                  <span
                    className={`flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
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
