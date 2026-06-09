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
  { bgClass: string; textClass: string; label: string }
> = {
  active: {
    bgClass: "bg-status-active-bg",
    textClass: "text-status-active-text",
    label: "Active",
  },
  pending: {
    bgClass: "bg-status-pending-bg",
    textClass: "text-status-pending-text",
    label: "Pending",
  },
  suspended: {
    bgClass: "bg-red-100",
    textClass: "text-red-800",
    label: "Suspended",
  },
  rejected: {
    bgClass: "bg-status-cancelled-bg",
    textClass: "text-status-cancelled-text",
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
          <UserCheck size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">Agents</h2>
            <p className="text-text text-sm">
              {loading ? "Loading..." : `${agents.length} registered agents`}
            </p>
          </div>
        </div>
        <div className="border-gray-border flex items-center gap-2 rounded-full border bg-white px-4 py-2">
          <Search size={15} className="text-text" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-heading w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-gray-border text-text grid grid-cols-[2fr_1fr_1fr_110px_200px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
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
                className={`border-gray-border h-14 animate-pulse border-b ${i % 2 === 0 ? "bg-bg-light" : "bg-white"}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text px-5 py-8 text-center text-sm">
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
                  className="border-gray-border grid grid-cols-[2fr_1fr_1fr_110px_200px] items-center gap-4 border-b px-5 py-4 text-sm last:border-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-heading font-semibold">{agent.name}</p>
                    <p className="text-text text-xs">{agent.email}</p>
                    <p className="text-text text-xs">
                      Applied {agent.joinedDate}
                    </p>
                  </div>
                  <span className="text-text">{agent.location}</span>
                  <span className="text-text">{agent.phone}</span>
                  <span
                    className={`inline-flex w-fit items-center rounded-md px-3 py-1 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => void handleApprove(agent.id)}
                          disabled={isActioning}
                          className="bg-primary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                          <CheckCircle size={12} />
                          {isActioning ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => void handleReject(agent.id)}
                          disabled={isActioning}
                          className="border-status-cancelled-text text-status-cancelled-text flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
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
                        className="flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-700 transition-opacity hover:opacity-80 disabled:opacity-50"
                      >
                        <Ban size={12} />
                        {isActioning ? "…" : "Suspend"}
                      </button>
                    )}
                    {agent.status === "suspended" && (
                      <button
                        onClick={() => void handleUnsuspend(agent.id)}
                        disabled={isActioning}
                        className="bg-primary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
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
