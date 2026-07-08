'use client';

import { useEffect, useState } from 'react';
import { getProjects } from '@/lib/api';
import type { Project } from '@/types';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import ProjectCard from '@/components/project/ProjectCard';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="min-h-screen">
        {/* Header */}
        <section className="bg-primary text-white py-16 md:py-24">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              项目
            </h1>
            <p className="text-base text-white/70 max-w-2xl leading-relaxed">
              这里展示了我参与和独立开发的技术项目，涵盖 Web 应用、工具库和开源贡献。
              每一个项目都是学习与成长的见证。
            </p>
          </div>
        </section>

        {/* Projects grid */}
        <section className="py-16 md:py-24">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
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
        </section>
      </main>
      <Footer />
    </>
  );
}
