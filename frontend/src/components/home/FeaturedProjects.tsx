'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeaturedProjects, getFeaturedBundles } from '@/lib/api';
import type { Project, FileBundle } from '@/types';

/** Stagger offsets for 3-column layout */
const STAGGER_CLASSES = ['', 'lg:-mt-8', 'lg:-mt-16'];

/** Unified item for display: either a Project or a Skill Bundle */
type FeaturedItem =
  | { type: 'project'; data: Project }
  | { type: 'bundle'; data: FileBundle };

/** Shared card container classes — unified across project & bundle cards */
const CARD_CLASSES =
  'h-full flex flex-col rounded-lg border border-outline-variant bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]';

/** Shared content area classes — flex-1 to fill remaining card height, mt-auto on footer */
const CARD_BODY_CLASSES = 'p-6 flex-1 flex flex-col';

/**
 * 首页精选作品区域
 *
 * 同时展示精选项目（Project）和 Skill Bundle，统一为卡片网格布局。
 *
 * 核心设计：
 * - **瀑布流错落**：3 列布局时使用 `STAGGER_CLASSES` 实现交错偏移（`lg:-mt-8`、`lg:-mt-16`）
 * - **动态列数**：根据实际作品数量动态调整网格列数（1/2/3 列），不足时居中对齐
 * - **占位卡片**：当实际数量不足 `displaySlots` 时，用虚线边框卡片补足
 *
 * 三种状态：
 * - **Loading**：3 个骨架屏脉冲卡片
 * - **Empty**：3 个虚线占位卡片，提示「更多项目即将上线」
 * - **Data**：项目卡片 + Skill 卡片混合排列
 *
 * Skill 卡片与 Project 卡片共享统一的 `CARD_CLASSES` 和 `CARD_BODY_CLASSES` 以保证视觉一致。
 */
export default function FeaturedProjects() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFeaturedProjects(3).catch(() => [] as Project[]),
      getFeaturedBundles(3).catch(() => [] as FileBundle[]),
    ])
      .then(([projects, bundles]) => {
        const combined: FeaturedItem[] = [
          ...projects.map((p) => ({ type: 'project' as const, data: p })),
          ...bundles.map((b) => ({ type: 'bundle' as const, data: b })),
        ];
        setItems(combined);
      })
      .finally(() => setLoading(false));
  }, []);

  // 根据实际作品数量决定展示槽位数和网格列数
  const actualCount = items.length;
  const displaySlots = actualCount === 0 ? 3 : Math.min(Math.max(actualCount, 1), 3);
  const showViewAll = actualCount >= 3;

  const gridClass =
    displaySlots === 1
      ? 'grid grid-cols-1 gap-8 max-w-md mx-auto'
      : displaySlots === 2
        ? 'grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto'
        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';

  return (
    <section className="bg-surface-container-low py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <h2 className="text-3xl sm:text-[36px] font-bold tracking-[-0.01em] text-primary">
            精选作品
          </h2>
          {showViewAll && (
            <Link
              href="/projects"
              className="text-primary text-base font-medium flex items-center gap-2 hover:underline"
            >
              全部项目
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-outline-variant bg-surface p-6 animate-pulse"
              >
                <div className="w-full aspect-video bg-surface-container rounded-t-lg" />
                <div className="mt-4 h-4 bg-surface-container rounded w-1/2" />
                <div className="mt-2 h-5 bg-surface-container rounded w-3/4" />
                <div className="mt-2 h-4 bg-surface-container rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[360px]"
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
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
                <p className="text-sm text-on-surface-variant/50">
                  更多项目即将上线
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {!loading && items.length > 0 && (
          <div className={gridClass}>
            {items.slice(0, displaySlots).map((item, index) => {
              // ---- Skill Bundle card ----
              if (item.type === 'bundle') {
                const bundle = item.data;
                return (
                  <div
                    key={`bundle-${bundle.id}`}
                    className={`h-full ${displaySlots >= 3 ? (STAGGER_CLASSES[index] || '') : ''}`}
                  >
                    <Link href={`/projects/skills/${bundle.id}`} className="block h-full">
                      <article className={CARD_CLASSES}>
                        {/* Hero area — same aspect-video as project card for visual consistency */}
                        <div className="aspect-video shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                          <div className="text-center">
                            <svg
                              className="w-16 h-16 text-primary/30 mx-auto mb-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                              />
                            </svg>
                            <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold tracking-wider uppercase">
                              SKILL
                            </span>
                          </div>
                        </div>

                        {/* Content — unified specs */}
                        <div className={CARD_BODY_CLASSES}>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="inline-block px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-medium">
                              {bundle.type || 'SKILL'}
                            </span>
                            <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
                              {(bundle.fileCount ?? 0)} 个文件
                            </span>
                          </div>

                          <h3 className="font-display text-lg font-semibold text-primary mb-2 line-clamp-1">
                            {bundle.name}
                          </h3>

                          <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 min-h-[2.5rem]">
                            {bundle.description || '暂无描述'}
                          </p>

                          {/* Author */}
                          <div className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 mt-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Sean
                          </div>

                          <span className="text-secondary text-sm font-medium flex items-center gap-1 mt-auto pt-4">
                            浏览 Skill
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 6L21 12m0 0l-7.5 7.5M21 12H3"
                              />
                            </svg>
                          </span>
                        </div>
                      </article>
                    </Link>
                  </div>
                );
              }

              // ---- Project card ----
              const project = item.data as Project;
              const tagList: string[] = (() => {
                try {
                  return JSON.parse(project.tags || '[]');
                } catch {
                  return [];
                }
              })();

              return (
                <div
                  key={`project-${project.id}`}
                  className={`h-full ${displaySlots >= 3 ? (STAGGER_CLASSES[index] || '') : ''}`}
                >
                  <article className={CARD_CLASSES}>
                    {/* Cover image — aspect-video */}
                    {project.coverImage ? (
                      <div className="aspect-video shrink-0 overflow-hidden">
                        <img
                          src={project.coverImage}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video shrink-0 bg-surface-container flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-outline-variant"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Content — unified specs */}
                    <div className={CARD_BODY_CLASSES}>
                      {tagList.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tagList.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <h3 className="font-display text-lg font-semibold text-primary mb-2 line-clamp-1">
                        {project.title}
                      </h3>

                      <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 min-h-[2.5rem]">
                        {project.description}
                      </p>

                      {/* Author */}
                      <div className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 mt-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Sean
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 mt-auto pt-4">
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 rounded bg-primary text-white text-xs font-medium transition-opacity hover:opacity-90"
                          >
                            访问网站
                          </a>
                        )}
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 rounded border border-outline text-on-surface-variant text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                          >
                            GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}

            {/* 占位卡片：用虚线卡片补足到 displaySlots 个槽位 */}
            {items.length < displaySlots &&
              Array.from({ length: displaySlots - items.length }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[360px]"
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
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                  <p className="text-sm text-on-surface-variant/50">
                    更多项目即将上线
                  </p>
                </div>
              ))}
          </div>
        )}

      </div>
    </section>
  );
}
