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
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-24">
      <div className="max-w-[720px]">
        <h2 className="text-3xl sm:text-[36px] font-bold tracking-[-0.01em] text-primary mb-12">
          精选文章
        </h2>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface p-6 rounded-xl animate-pulse"
              >
                <div className="h-4 bg-surface-container rounded w-24 mb-3" />
                <div className="h-5 bg-surface-container rounded w-3/4 mb-2" />
                <div className="h-4 bg-surface-container rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center p-12 text-center min-h-[120px]"
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
                <p className="text-sm text-on-surface-variant/50">文章即将发布</p>
              </div>
            ))}
          </div>
        )}

        {/* Article list */}
        {!loading && articles.length > 0 && (
          <div className="space-y-4">
            {articles.map((article) => (
              <article
                key={article.id}
                className="group bg-surface p-6 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant"
              >
                <div className="flex flex-col md:flex-row md:items-center md:gap-8">
                  {/* Date */}
                  <div className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant mb-2 md:mb-0 w-32 shrink-0">
                    {formatDate(article.createdAt)}
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-primary group-hover:text-secondary transition-colors mb-2">
                      <Link href={`/blog/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-1">
                      {article.excerpt || '暂无摘要'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-5 h-5 text-outline group-hover:text-secondary transition-colors hidden md:block shrink-0"
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
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Read more button */}
        {articles.length > 0 && (
          <div className="mt-12">
            <Link
              href="/blog"
              className="bg-surface-container-high text-primary px-8 py-3 rounded-lg text-base font-medium hover:bg-surface-container-highest transition-colors inline-block"
            >
              阅读更多文章
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
