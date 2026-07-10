'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getPageViewRanking,
  getPageViewTrend,
  getPageViewSummary,
  getVisitorCountries,
  getVisitorSummary,
} from '@/lib/api';
import type {
  PageViewStatVO,
  PageViewTrendVO,
  PageViewSummaryVO,
  CountryStatVO,
  VisitorSummaryVO,
} from '@/types';

// ---------------------------------------------------------------------------
// 页面类型 → 中文名
// ---------------------------------------------------------------------------
const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  blog_list: '博客列表',
  blog_detail: '博客详情',
  projects: '项目展示',
  about: '关于我',
  skills: 'Skill 列表',
  skills_detail: 'Skill 详情',
};

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function StatCard({ title, value, delta }: { title: string; value: number; delta?: number }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-6">
      <p className="text-sm text-on-surface-variant mb-2">{title}</p>
      <p className="text-3xl font-display font-bold text-primary">{value.toLocaleString()}</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`text-xs mt-1 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% 环比
        </p>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: PageViewTrendVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无趋势数据</p>;

  const maxVal = Math.max(
    1,
    ...data.map((d) =>
      Math.max(d.home, d.blogList, d.blogDetail, d.projects, d.about, d.skills, d.skillsDetail),
    ),
  );

  const lines = [
    { key: 'home', label: '首页', color: 'bg-blue-500' },
    { key: 'blogList', label: '博客列表', color: 'bg-emerald-500' },
    { key: 'blogDetail', label: '博客详情', color: 'bg-violet-500' },
    { key: 'projects', label: '项目', color: 'bg-amber-500' },
    { key: 'about', label: '关于', color: 'bg-rose-500' },
    { key: 'skills', label: 'Skill', color: 'bg-cyan-500' },
    { key: 'skillsDetail', label: 'Skill详情', color: 'bg-indigo-500' },
  ];

  return (
    <div>
      {/* 图例 */}
      <div className="flex flex-wrap gap-3 mb-4">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-xs text-on-surface-variant">{l.label}</span>
          </div>
        ))}
      </div>
      {/* 柱状图 */}
      <div className="flex items-end gap-0.5 h-48">
        {data.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-full flex flex-col-reverse" style={{ height: 160 }}>
                {lines.map((l) => {
                  const val = (day as unknown as Record<string, number>)[l.key] || 0;
                  const h = maxVal > 0 ? (val / maxVal) * 160 : 0;
                  return <div key={l.key} className={`w-full ${l.color}`} style={{ height: h, minHeight: val > 0 ? 2 : 0 }} />;
                })}
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 truncate w-full text-center">
                {day.day.slice(5)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function RankingTable({ data }: { data: PageViewStatVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无排行数据</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="text-left py-2 px-3 text-on-surface-variant font-medium">页面类型</th>
            <th className="text-left py-2 px-3 text-on-surface-variant font-medium">标识</th>
            <th className="text-right py-2 px-3 text-on-surface-variant font-medium">访问量</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
              <td className="py-2 px-3 text-on-surface">{PAGE_TYPE_LABELS[item.pageType] || item.pageType}</td>
              <td className="py-2 px-3 text-on-surface-variant font-mono text-xs max-w-[200px] truncate">
                {item.pageKey || '-'}
              </td>
              <td className="py-2 px-3 text-on-surface text-right font-medium">{item.cnt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountryTable({ data }: { data: CountryStatVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无访客数据</p>;

  const maxCnt = data[0]?.cnt || 1;

  return (
    <div>
      {data.map((item) => (
        <div key={item.country} className="flex items-center gap-3 py-2 border-b border-outline-variant/50">
          <span className="text-sm text-on-surface w-20 truncate">{item.country}</span>
          <div className="flex-1 bg-surface-container-low rounded-full h-4 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${(item.cnt / maxCnt) * 100}%` }}
            />
          </div>
          <span className="text-sm text-on-surface-variant w-20 text-right">
            {item.cnt.toLocaleString()} ({item.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const [window, setWindow] = useState<'7d' | '30d'>('7d');
  const [trendDays, setTrendDays] = useState(7);

  const [summary, setSummary] = useState<PageViewSummaryVO | null>(null);
  const [trend, setTrend] = useState<PageViewTrendVO[]>([]);
  const [ranking, setRanking] = useState<PageViewStatVO[]>([]);
  const [countries, setCountries] = useState<CountryStatVO[]>([]);
  const [visitorSummary, setVisitorSummary] = useState<VisitorSummaryVO | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, r, c, v] = await Promise.all([
        getPageViewSummary(),
        getPageViewTrend(trendDays),
        getPageViewRanking(window),
        getVisitorCountries(window),
        getVisitorSummary(),
      ]);
      setSummary(s);
      setTrend(t);
      setRanking(r);
      setCountries(c);
      setVisitorSummary(v);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [window, trendDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWindowChange = (w: '7d' | '30d') => {
    setWindow(w);
    setTrendDays(w === '7d' ? 7 : 30);
  };

  return (
    <div>
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-on-surface">访问统计</h1>
        <p className="text-sm text-on-surface-variant mt-1">页面浏览量与访客地理分布分析</p>
      </div>

      {/* 时间窗口切换 */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d'] as const).map((w) => (
          <button
            key={w}
            onClick={() => handleWindowChange(w)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              window === w
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {w === '7d' ? '近 7 天' : '近 30 天'}
          </button>
        ))}
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button onClick={fetchData} className="text-sm text-red-700 underline">重试</button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && !summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-outline-variant rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-surface-container-high rounded w-16 mb-3" />
                <div className="h-8 bg-surface-container-high rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据展示 */}
      {summary && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard title="总 PV" value={summary.totalPv} delta={summary.totalDelta} />
            <StatCard title="本周 PV" value={summary.weekPv} delta={summary.weekDelta} />
            <StatCard title="今日 PV" value={summary.todayPv} />
          </div>

          {/* UV 卡片 */}
          {visitorSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard title="总 UV" value={visitorSummary.totalUv} />
              <StatCard title="本周 UV" value={visitorSummary.weekUv} />
              <StatCard title="今日 UV" value={visitorSummary.todayUv} />
            </div>
          )}

          {/* 趋势图 */}
          <div className="bg-surface border border-outline-variant rounded-lg p-6 mb-8">
            <h2 className="text-lg font-display font-semibold text-on-surface mb-4">每日 PV 趋势</h2>
            <TrendChart data={trend} />
          </div>

          {/* 双列布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PV 排行 */}
            <div className="bg-surface border border-outline-variant rounded-lg p-6">
              <h2 className="text-lg font-display font-semibold text-on-surface mb-4">页面排行</h2>
              <RankingTable data={ranking} />
            </div>

            {/* 国家分布 */}
            <div className="bg-surface border border-outline-variant rounded-lg p-6">
              <h2 className="text-lg font-display font-semibold text-on-surface mb-4">访客国家分布</h2>
              <CountryTable data={countries} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
