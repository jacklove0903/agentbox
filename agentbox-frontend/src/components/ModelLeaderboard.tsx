"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ModelStat {
  modelId: string;
  votes: number;
  winRate: number;
}

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
}

export function ModelLeaderboard() {
  const [stats, setStats] = useState<ModelStat[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, modelsRes] = await Promise.all([
        apiFetch("/api/votes/stats"),
        apiFetch("/api/models/getmodels"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (modelsRes.ok) setModels(await modelsRes.json());
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getModel = (id: string) => models.find((m) => m.id === id);
  const totalVotes = stats.reduce((sum, s) => sum + s.votes, 0);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              模型排行榜
            </h2>
            <p className="text-xs text-gray-400">
              共 {totalVotes} 次投票
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">加载中...</p>
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-1">暂无投票数据</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs">
            在多模型对比时点击 👍 为最佳回答投票
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((stat, idx) => {
            const model = getModel(stat.modelId);
            const barWidth = totalVotes > 0 ? (stat.votes / totalVotes) * 100 : 0;
            return (
              <div
                key={stat.modelId}
                className="relative flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-gray-100 dark:border-neutral-800 overflow-hidden"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 dark:to-transparent transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />

                {/* Content */}
                <div className="relative flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg w-7 text-center flex-shrink-0">
                    {idx < 3 ? medals[idx] : `#${idx + 1}`}
                  </span>
                  {model ? (
                    <img
                      src={model.icon}
                      alt={model.name}
                      className="w-7 h-7 rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-neutral-700 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {model?.name || stat.modelId}
                  </span>
                </div>

                <div className="relative flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {stat.votes}
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {(stat.winRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
