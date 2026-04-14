import { useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, Search } from "lucide-react";

export function meta() {
  return [{ title: "Agents | Debridgers Admin" }];
}

type AgentStatus = "active" | "pending" | "suspended";

interface AgentRow {
  id: string;
  name: string;
  location: string;
  bagsSold: number;
  commission: string;
  status: AgentStatus;
  joinedDate: string;
}

const MOCK_AGENTS: AgentRow[] = [
  {
    id: "a1",
    name: "Fatima Kabir",
    location: "Sabon Tasha",
    bagsSold: 42,
    commission: "₦126,000",
    status: "active",
    joinedDate: "Jan 12, 2026",
  },
  {
    id: "a2",
    name: "Usman Ibrahim",
    location: "Kakuri",
    bagsSold: 38,
    commission: "₦114,000",
    status: "active",
    joinedDate: "Jan 15, 2026",
  },
  {
    id: "a3",
    name: "Amina Yusuf",
    location: "Barnawa",
    bagsSold: 35,
    commission: "₦105,000",
    status: "active",
    joinedDate: "Feb 3, 2026",
  },
  {
    id: "a4",
    name: "Chidi Okafor",
    location: "Narayi",
    bagsSold: 29,
    commission: "₦87,000",
    status: "pending",
    joinedDate: "Mar 20, 2026",
  },
  {
    id: "a5",
    name: "Ngozi Eze",
    location: "Zaria",
    bagsSold: 0,
    commission: "₦0",
    status: "pending",
    joinedDate: "Apr 1, 2026",
  },
  {
    id: "a6",
    name: "Emeka Nwosu",
    location: "Kaduna North",
    bagsSold: 12,
    commission: "₦36,000",
    status: "suspended",
    joinedDate: "Feb 10, 2026",
  },
];

const STATUS_BADGE: Record<
  AgentStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "var(--status-active-bg)",
    text: "var(--status-active-text)",
    label: "Active",
  },
  pending: {
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    label: "Pending",
  },
  suspended: { bg: "#FEE2E2", text: "#991B1B", label: "Suspended" },
};

export default function AdminAgents() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserCheck size={24} style={{ color: "var(--primary-color)" }} />
          <div>
            <h2
              className="font-syne text-xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Agents
            </h2>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              {MOCK_AGENTS.length} registered agents
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
            placeholder="Search agents..."
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
          className="grid grid-cols-[1fr_1fr_80px_100px_90px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Agent</span>
          <span>Location</span>
          <span>Bags Sold</span>
          <span>Commission</span>
          <span>Status</span>
        </div>

        {filtered.map((agent, i) => {
          const badge = STATUS_BADGE[agent.status];
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr_1fr_80px_100px_90px] gap-4 border-b px-5 py-4 text-sm last:border-0"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <div className="flex flex-col gap-0.5">
                <p
                  className="font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {agent.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                  Joined {agent.joinedDate}
                </p>
              </div>
              <span style={{ color: "var(--text-colour)" }}>
                {agent.location}
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {agent.bagsSold}
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--primary-color)" }}
              >
                {agent.commission}
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
            No agents match your search.
          </p>
        )}
      </div>
    </div>
  );
}
