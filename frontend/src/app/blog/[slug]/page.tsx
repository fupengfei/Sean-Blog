'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/api';
import type { Article } from '@/types';
import MarkdownRenderer from '@/components/blog/MarkdownRenderer';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    getArticleBySlug(slug)
      .then(setArticle)
      .catch((err) => {
        const message = err instanceof Error ? err.message : '加载文章失败';
        setError(message);
        setArticle(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 animate-pulse">
          <div className="h-4 bg-surface-container rounded w-1/3 mb-6" />
          <div className="h-10 bg-surface-container rounded w-3/4 mb-4" />
          <div className="h-6 bg-surface-container rounded w-1/4 mb-12" />
          <div className="space-y-3">
            <div className="h-4 bg-surface-container rounded w-full" />
            <div className="h-4 bg-surface-container rounded w-5/6" />
            <div className="h-4 bg-surface-container rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-32 text-center">
          <h1 className="font-display text-2xl font-bold text-primary mb-4">
            {error?.includes('404') || error?.includes('不存在') ? '文章不存在' : '加载失败'}
          </h1>
          <p className="text-on-surface-variant mb-8">
            {error || '无法找到该文章'}
          </p>
          <Link
            href="/blog"
            className="inline-flex px-6 py-2.5 rounded bg-primary text-white text-sm font-medium hover:bg-primary-container transition-colors"
          >
            ← 返回博客
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="min-h-screen">
      {/* Article header */}
      <header className="py-12 md:py-16 bg-surface-container-low">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-on-surface-variant hover:text-primary transition-colors mb-8"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            ← 返回博客
          </Link>

          {/* Title */}
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            {article.category && (
              <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-secondary text-xs font-semibold">
                {article.category.name}
              </span>
            )}
            <span className="text-sm text-on-surface-variant/60">
              {formatDate(article.createdAt)}
            </span>
          </div>
        </div>
      </header>

      {/* Optional cover image */}
      {article.coverImage && (
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 mt-8">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-auto rounded-lg"
          />
        </div>
      )}

      {/* Article body */}
      <section className="py-12 md:py-16">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6">
          <MarkdownRenderer content={article.contentMd || ''} />
        </div>
      </section>

      {/* Footer navigation */}
      <footer className="pb-16">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6">
          <div className="border-t border-outline-variant pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              返回博客列表
            </Link>
          </div>
        </div>
      </footer>
    </article>
  );
}
