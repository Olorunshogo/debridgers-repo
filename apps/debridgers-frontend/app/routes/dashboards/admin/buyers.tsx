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
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "var(--status-active-bg)",
    text: "var(--status-active-text)",
    label: "Active",
  },
  inactive: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
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
          <ShoppingBag size={24} style={{ color: "var(--primary-color)" }} />
          <div>
            <h2
              className="font-syne text-xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Buyers
            </h2>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              {loading ? "Loading..." : `${buyers.length} registered buyers`}
            </p>
          </div>
        </div>

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

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="grid grid-cols-[1fr_1fr_1fr_90px_80px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
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
                className="h-14 animate-pulse border-b"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor:
                    i % 2 === 0 ? "var(--bg-light)" : "var(--white)",
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p
            className="px-5 py-8 text-center text-sm"
            style={{ color: "var(--text-colour)" }}
          >
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
                  className="grid grid-cols-[1fr_1fr_1fr_90px_80px] gap-4 border-b px-5 py-4 text-sm last:border-0"
                  style={{ borderColor: "var(--border-gray)" }}
                >
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {buyer.name}
                    </p>
                    {buyer.verified && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--status-active-text)" }}
                      >
                        ✓ Verified
                      </p>
                    )}
                  </div>
                  <span
                    className="truncate text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {buyer.email}
                  </span>
                  <span style={{ color: "var(--text-colour)" }}>
                    {buyer.phone}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {buyer.joinedDate}
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
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
