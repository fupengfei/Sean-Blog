'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBundles } from '@/lib/api';
import type { FileBundle } from '@/types';
import BundleCard from '@/components/skill/BundleCard';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';

/**
 * Skill 列表页（/blog/skills）
 *
 * 数据获取：客户端 fetch（getBundles），挂载时一次性加载
 *
 * 页面结构：返回博客链接 + 标题 + BundleCard 网格
 *
 * 状态覆盖：
 * - loading：3 列骨架屏卡片
 * - empty：虚线占位卡片（"更多 Skill 即将上线"），不足 3 个时补位
 * - normal：BundleCard 网格，不足 3 时 justify-center + 虚线补位
 */
export default function SkillsPage() {
  const [bundles, setBundles] = useState<FileBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBundles()
      .then(setBundles)
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-16 md:py-24">
          {/* Header */}
          <div className="mb-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              返回博客
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
              Skills
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              技术能力与代码示例集合
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-outline-variant p-6 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-surface-container rounded" />
                    <div className="h-5 bg-surface-container rounded w-2/3" />
                  </div>
                  <div className="h-3 bg-surface-container rounded w-full mb-1" />
                  <div className="h-3 bg-surface-container rounded w-3/4 mb-4" />
                  <div className="h-5 bg-surface-container rounded w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && bundles.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[220px]"
                >
                  <svg
                    className="w-12 h-12 text-outline-variant mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                    />
                  </svg>
                  <p className="text-sm text-on-surface-variant/50">
                    更多 Skill 即将上线
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Bundle cards */}
          {!loading && bundles.length > 0 && (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${
                bundles.length < 3 ? 'justify-center' : ''
              }`}
            >
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}

              {/* Placeholder cards for consistent grid */}
              {bundles.length > 0 &&
                bundles.length < 3 &&
                Array.from({ length: 3 - bundles.length }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[220px]"
                  >
                    <svg
                      className="w-12 h-12 text-outline-variant mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                      />
                    </svg>
                    <p className="text-sm text-on-surface-variant/50">
                      更多 Skill 即将上线
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
