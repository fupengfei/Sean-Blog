'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeaturedArticles } from '@/lib/api';
import type { Article } from '@/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function FeaturedArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedArticles(6)
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 md:py-24 bg-surface-container-low">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            精选文章
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-outline-variant bg-white p-6 animate-pulse"
              >
                <div className="h-4 bg-surface-container rounded w-1/4 mb-3" />
                <div className="h-5 bg-surface-container rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-container rounded w-full mb-1" />
                <div className="h-3 bg-surface-container rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border-2 border-dashed border-outline-variant bg-white flex flex-col items-center justify-center p-12 text-center min-h-[200px]"
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
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
                <p className="text-sm text-on-surface-variant/50">
                  文章即将发布
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Article cards */}
        {!loading && articles.length > 0 && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${
              articles.length === 1 ? 'justify-center' : ''
            }`}
          >
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group rounded-lg border border-outline-variant bg-white overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              >
                {/* Cover image (optional) */}
                {article.coverImage && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Metadata row */}
                  <div className="flex items-center gap-3 mb-3">
                    {article.category && (
                      <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-secondary text-xs font-semibold">
                        {article.category.name}
                      </span>
                    )}
                    <span className="text-xs text-on-surface-variant/60">
                      {formatDate(article.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg font-semibold text-primary mb-2 group-hover:text-secondary transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4 line-clamp-2">
                    {article.excerpt || '暂无摘要'}
                  </p>

                  {/* Read more */}
                  <span className="text-sm font-medium text-secondary group-hover:underline">
                    阅读全文 →
                  </span>
                </div>
              </Link>
            ))}

            {/* Placeholder cards */}
            {articles.length > 0 &&
              articles.length % 2 !== 0 &&
              articles.length < 6 && (
                <div className="rounded-lg border-2 border-dashed border-outline-variant bg-white flex flex-col items-center justify-center p-12 text-center min-h-[200px]">
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
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  <p className="text-sm text-on-surface-variant/50">
                    更多文章即将发布
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </section>
  );
}
