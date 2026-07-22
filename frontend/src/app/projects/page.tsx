'use client';

import { useEffect, useState } from 'react';
import { getProjects, getBundles } from '@/lib/api';
import type { Project, FileBundle } from '@/types';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import ProjectCard from '@/components/project/ProjectCard';
import BundleCard from '@/components/skill/BundleCard';

/**
 * 项目展示页（/projects）
 *
 * 数据获取：客户端 fetch，挂载时并行请求 getProjects + getBundles（Promise.all）
 *
 * 页面结构：
 * - 头部标题 "精选作品"
 * - 项目卡片网格（ProjectCard）
 * - Skills 区块（BundleCard，依附于项目页展示技术能力）
 *
 * 状态覆盖：
 * - loading：6 个骨架屏卡片
 * - empty：虚线占位卡片（"更多项目正在开发中"），不足 3 时 justify-center
 * - normal：ProjectCard 网格 + 可选 Skills 区块
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bundles, setBundles] = useState<FileBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProjects().catch(() => []),
      getBundles().catch(() => []),
    ])
      .then(([p, b]) => {
        setProjects(p);
        setBundles(b);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto">
        {/* Header — 匹配 v2_3 设计稿 */}
        <div className="mb-16">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4">
            精选作品
          </h1>
          <div className="w-16 h-1 bg-secondary rounded-full"></div>
          <p className="mt-6 text-base text-on-surface-variant max-w-2xl leading-relaxed">
            展示我在数据可视化、企业级系统和交互设计领域的探索。通过严谨的工程实践，为业务痛点提供优雅的解决方案。
          </p>
        </div>

        {/* Projects grid */}
        <div>
            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-outline-variant p-6 animate-pulse"
                  >
                    <div className="w-full aspect-video bg-surface-container rounded mb-4" />
                    <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                    <div className="h-3 bg-surface-container rounded w-full mb-1" />
                    <div className="h-3 bg-surface-container rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && projects.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[320px]"
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
                      更多项目正在开发中
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Project cards */}
            {!loading && projects.length > 0 && (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${
                  projects.length < 3 ? 'justify-center' : ''
                }`}
              >
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
        </div>

        {/* Skills 区块 */}
        {!loading && bundles.length > 0 && (
          <section className="mt-24">
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-block px-3 py-1 rounded bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                  SKILL 能力
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-4">
                技术能力
              </h2>
              <div className="w-16 h-1 bg-secondary rounded-full" />
              <p className="mt-6 text-base text-on-surface-variant max-w-2xl leading-relaxed">
                可复用的 SKILL 能力模块 — 代码示例与技术文档集合，涵盖 AI、数据工程、前后端开发等领域。每个模块包含完整代码和说明文档。
              </p>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${
                bundles.length < 3 ? 'justify-center' : ''
              }`}
            >
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}

              {bundles.length < 3 &&
                Array.from({ length: 3 - bundles.length }).map((_, i) => (
                  <div
                    key={`skill-placeholder-${i}`}
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
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
