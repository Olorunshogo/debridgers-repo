import { motion } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";

export function meta() {
  return [{ title: "Leaderboard | Debridgers" }];
}

const MOCK_LEADERS = [
  {
    rank: 1,
    name: "Chidi Okafor",
    sales: 42,
    commission: "₦126,000",
    badge: "gold",
  },
  {
    rank: 2,
    name: "Amina Yusuf",
    sales: 38,
    commission: "₦114,000",
    badge: "silver",
  },
  {
    rank: 3,
    name: "Tunde Adeyemi",
    sales: 35,
    commission: "₦105,000",
    badge: "bronze",
  },
  { rank: 4, name: "Ngozi Eze", sales: 29, commission: "₦87,000", badge: null },
  {
    rank: 5,
    name: "Emeka Nwosu",
    sales: 24,
    commission: "₦72,000",
    badge: null,
  },
];

const badgeColors: Record<string, string> = {
  gold: "#F59E0B",
  silver: "#9CA3AF",
  bronze: "#B45309",
};

export default function AgentLeaderboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Leaderboard
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Top performing agents this month
          </p>
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4">
        {MOCK_LEADERS.slice(0, 3).map((agent, i) => (
          <motion.div
            key={agent.rank}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
              order: agent.rank === 1 ? -1 : agent.rank,
            }}
          >
            <Medal size={28} color={badgeColors[agent.badge!]} />
            <p
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              {agent.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              {agent.sales} sales
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: "var(--primary-color)" }}
            >
              {agent.commission}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Full table */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="grid grid-cols-4 gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase"
          style={{
            borderColor: "var(--border-gray)",
            color: "var(--text-colour)",
          }}
        >
          <span>Rank</span>
          <span>Agent</span>
          <span>Sales</span>
          <span>Commission</span>
        </div>
        {MOCK_LEADERS.map((agent, i) => (
          <motion.div
            key={agent.rank}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm last:border-0"
            style={{ borderColor: "var(--border-gray)" }}
          >
            <span
              className="flex items-center gap-1 font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              {agent.badge ? (
                <Star
                  size={14}
                  fill={badgeColors[agent.badge]}
                  color={badgeColors[agent.badge]}
                />
              ) : null}
              #{agent.rank}
            </span>
            <span style={{ color: "var(--heading-colour)" }}>{agent.name}</span>
            <span style={{ color: "var(--text-colour)" }}>{agent.sales}</span>
            <span
              className="font-semibold"
              style={{ color: "var(--primary-color)" }}
            >
              {agent.commission}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
