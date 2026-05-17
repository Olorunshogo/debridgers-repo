import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";
import { apiFetch } from "../../../utils/apiFetch";

export function meta() {
  return [{ title: "Leaderboard | Debridgers" }];
}

interface LeaderEntry {
  rank: number;
  name: string;
  location: string;
  bags_sold: number;
}

const BADGE_MAP: Record<number, string> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

const badgeColors: Record<string, string> = {
  gold: "#F59E0B",
  silver: "#9CA3AF",
  bronze: "#B45309",
};

export default function AgentLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LeaderEntry[]>("/agent/leaderboard")
      .then(setLeaders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const top3 = leaders.slice(0, 3);

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
            Top performing agents — all time
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl"
                style={{ backgroundColor: "var(--border-gray)" }}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && top3.length > 0 && (
        <>
          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-4">
            {top3.map((agent, i) => {
              const badge = BADGE_MAP[agent.rank];
              return (
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
                  <Medal size={28} color={badgeColors[badge]} />
                  <p
                    className="font-syne font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {agent.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {agent.bags_sold} bags
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {agent.location}
                  </p>
                </motion.div>
              );
            })}
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
              <span>Location</span>
              <span>Bags Sold</span>
            </div>
            {leaders.map((agent, i) => {
              const badge = BADGE_MAP[agent.rank];
              return (
                <motion.div
                  key={agent.rank}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm last:border-0"
                  style={{ borderColor: "var(--border-gray)" }}
                >
                  <span
                    className="flex items-center gap-1 font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {badge ? (
                      <Star
                        size={14}
                        fill={badgeColors[badge]}
                        color={badgeColors[badge]}
                      />
                    ) : null}
                    #{agent.rank}
                  </span>
                  <span style={{ color: "var(--heading-colour)" }}>
                    {agent.name}
                  </span>
                  <span style={{ color: "var(--text-colour)" }}>
                    {agent.location}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary-color)" }}
                  >
                    {agent.bags_sold}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {!loading && leaders.length === 0 && (
        <p
          className="py-12 text-center text-sm"
          style={{ color: "var(--text-colour)" }}
        >
          No leaderboard data yet.
        </p>
      )}
    </div>
  );
}
