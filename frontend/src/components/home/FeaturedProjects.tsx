'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeaturedProjects } from '@/lib/api';
import type { Project } from '@/types';

export default function FeaturedProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedProjects(3)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            精选项目
          </h2>
          <Link
            href="/projects"
            className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[280px]"
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

        {/* Project cards */}
        {!loading && projects.length > 0 && (
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${
              projects.length < 3 ? 'justify-center' : ''
            }`}
          >
            {projects.map((project) => {
              const tagList: string[] = (() => {
                try {
                  return JSON.parse(project.tags || '[]');
                } catch {
                  return [];
                }
              })();

              return (
                <article
                  key={project.id}
                  className="rounded-lg border border-outline-variant bg-white overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                >
                  {/* Cover image */}
                  {project.coverImage ? (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={project.coverImage}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-surface-container flex items-center justify-center">
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

                  <div className="p-6">
                    {/* Tags */}
                    {tagList.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tagList.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-0.5 rounded-full bg-surface-container-low text-xs font-medium text-on-surface-variant"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="font-display text-lg font-semibold text-primary mb-2 line-clamp-1">
                      {project.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-4 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded bg-primary text-white text-xs font-medium transition-opacity hover:opacity-90"
                        >
                          在线演示
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
              );
            })}

            {/* Placeholder cards to fill 3-column layout (only when less than 3 but not 0) */}
            {projects.length > 0 &&
              projects.length < 3 &&
              Array.from({ length: 3 - projects.length }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[280px]"
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
