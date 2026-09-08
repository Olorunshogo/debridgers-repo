import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Leaderboard | Debridgers",
    description:
      "See how you rank among Debridgers agents. Top performers earn priority orders and higher targets.",
    path: "/leaderboard",
    noIndex: true,
  });
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
    <div className="py-section-px flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Trophy size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            Leaderboard
          </h2>
          <p className="text-body text-sm">Top performing agents - all time</p>
        </div>
      </div>

      {loading && (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-line h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {!loading && top3.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {top3.map((agent, i) => {
              const badge = BADGE_MAP[agent.rank];
              return (
                <motion.div
                  key={agent.rank}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-line flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 text-center"
                  style={{ order: agent.rank === 1 ? -1 : agent.rank }}
                >
                  <Medal size={28} color={badgeColors[badge]} />
                  <p className="font-syne text-heading font-semibold">
                    {agent.name}
                  </p>
                  <p className="text-body text-xs">{agent.bags_sold} bags</p>
                  <p className="text-body text-xs">{agent.location}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="border-line overflow-hidden rounded-2xl border bg-white">
            <div className="border-line text-body grid grid-cols-4 gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
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
                  className="border-line grid grid-cols-4 gap-4 border-b px-5 py-4 text-sm last:border-0"
                >
                  <span className="text-heading flex items-center gap-1 font-bold">
                    {badge ? (
                      <Star
                        size={14}
                        fill={badgeColors[badge]}
                        color={badgeColors[badge]}
                      />
                    ) : null}
                    #{agent.rank}
                  </span>
                  <span className="text-heading">{agent.name}</span>
                  <span className="text-body">{agent.location}</span>
                  <span className="text-primary font-semibold">
                    {agent.bags_sold}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {!loading && leaders.length === 0 && (
        <p className="text-body py-12 text-center text-sm">
          No leaderboard data yet.
        </p>
      )}
    </div>
  );
}
