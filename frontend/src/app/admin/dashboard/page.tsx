"use client";

import { useEffect, useState } from "react";
import { adminGetArticles, adminGetProjects, adminGetBundles } from "@/lib/api";

interface Stats {
  articles: number;
  projects: number;
  bundles: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    articles: 0,
    projects: 0,
    bundles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [articleRes, projects, bundles] = await Promise.all([
          adminGetArticles({ page: 1, size: 1 }),
          adminGetProjects(),
          adminGetBundles(),
        ]);

        if (!cancelled) {
          setStats({
            articles: articleRes.total,
            projects: projects.length,
            bundles: bundles.length,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("加载统计数据失败");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "文章总数",
      value: stats.articles,
      icon: "📝",
    },
    {
      label: "项目总数",
      value: stats.projects,
      icon: "🚀",
    },
    {
      label: "Bundle 总数",
      value: stats.bundles,
      icon: "📦",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        仪表盘
      </h1>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-on-surface-variant">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-lg p-6 border border-outline-variant"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
              </div>
              <div className="text-3xl font-display font-bold text-primary mb-1">
                {card.value}
              </div>
              <div className="text-sm text-on-surface-variant font-ui">
                {card.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
