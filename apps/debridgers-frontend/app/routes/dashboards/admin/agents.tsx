import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  RotateCcw,
} from "lucide-react";
import { apiFetch, ApiError } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Agents | Debridgers Admin" },
    {
      name: "description",
      content:
        "View and manage all Debridgers field agents. Review applications, track performance and manage agent accounts.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type AgentStatus = "active" | "pending" | "suspended" | "rejected";

interface AgentRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: AgentStatus;
  joinedDate: string;
}

interface ApiAgent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  lga: string;
  applied_at: string;
}

function mapAgent(a: ApiAgent): AgentRow {
  const statusMap: Record<string, AgentStatus> = {
    approved: "active",
    pending: "pending",
    suspended: "suspended",
    rejected: "rejected",
  };
  return {
    id: a.id,
    name: `${a.first_name} ${a.last_name}`.trim(),
    email: a.email,
    phone: a.phone ?? "—",
    location: a.lga ?? "—",
    status: statusMap[a.status] ?? "pending",
    joinedDate: new Date(a.applied_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

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
  rejected: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
    label: "Rejected",
  },
};

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<ApiAgent[]>("/admin/agents");
      setAgents(rows.map(mapAgent));
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleApprove(id: number) {
    setActioningId(id);
    try {
      await apiFetch(`/admin/agents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
    } catch (err) {
      console.error(
        err instanceof ApiError ? err.message : "Failed to approve",
      );
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(id: number) {
    setActioningId(id);
    try {
      await apiFetch(`/admin/agents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)),
      );
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setActioningId(null);
    }
  }

  async function handleSuspend(id: number) {
    setActioningId(id);
    try {
      await apiFetch(`/admin/agents/${id}/suspend`, { method: "PATCH" });
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "suspended" } : a)),
      );
    } catch (err) {
      console.error(
        err instanceof ApiError ? err.message : "Failed to suspend",
      );
    } finally {
      setActioningId(null);
    }
  }

  async function handleUnsuspend(id: number) {
    setActioningId(id);
    try {
      await apiFetch(`/admin/agents/${id}/unsuspend`, { method: "PATCH" });
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
    } catch (err) {
      console.error(
        err instanceof ApiError ? err.message : "Failed to unsuspend",
      );
    } finally {
      setActioningId(null);
    }
  }

  const filtered = useMemo(
    () =>
      agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.location.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [agents, search],
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
              {loading ? "Loading..." : `${agents.length} registered agents`}
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
          className="grid grid-cols-[2fr_1fr_1fr_110px_200px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Agent</span>
          <span>Area (LGA)</span>
          <span>Phone</span>
          <span>Status</span>
          <span>Actions</span>
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
              ? "No agents match your search."
              : "No agents registered yet."}
          </p>
        ) : (
          <AnimatePresence>
            {filtered.map((agent, i) => {
              const badge = STATUS_BADGE[agent.status];
              const isPending = agent.status === "pending";
              const isActioning = actioningId === agent.id;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[2fr_1fr_1fr_110px_200px] items-center gap-4 border-b px-5 py-4 text-sm last:border-0"
                  style={{ borderColor: "var(--border-gray)" }}
                >
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {agent.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {agent.email}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      Applied {agent.joinedDate}
                    </p>
                  </div>
                  <span style={{ color: "var(--text-colour)" }}>
                    {agent.location}
                  </span>
                  <span style={{ color: "var(--text-colour)" }}>
                    {agent.phone}
                  </span>
                  <span
                    className="inline-flex w-fit items-center rounded-md px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => void handleApprove(agent.id)}
                          disabled={isActioning}
                          className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "var(--primary-color)" }}
                        >
                          <CheckCircle size={12} />
                          {isActioning ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => void handleReject(agent.id)}
                          disabled={isActioning}
                          className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{
                            borderColor: "var(--status-cancelled-text)",
                            color: "var(--status-cancelled-text)",
                          }}
                        >
                          <XCircle size={12} />
                          {isActioning ? "…" : "Reject"}
                        </button>
                      </>
                    )}
                    {agent.status === "active" && (
                      <button
                        onClick={() => void handleSuspend(agent.id)}
                        disabled={isActioning}
                        className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ borderColor: "#F59E0B", color: "#B45309" }}
                      >
                        <Ban size={12} />
                        {isActioning ? "…" : "Suspend"}
                      </button>
                    )}
                    {agent.status === "suspended" && (
                      <button
                        onClick={() => void handleUnsuspend(agent.id)}
                        disabled={isActioning}
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: "var(--primary-color)" }}
                      >
                        <RotateCcw size={12} />
                        {isActioning ? "…" : "Reinstate"}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
