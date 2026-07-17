'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getAdjacentArticles, getPrerequisiteArticle, getRelatedArticles } from '@/lib/api';
import type { Article, ArticleSummary } from '@/types';
import MarkdownRenderer from '@/components/blog/MarkdownRenderer';
import TableOfContents from '@/components/blog/TableOfContents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')   // 代码块
    .replace(/`[^`]+`/g, '')          // 行内代码
    .replace(/\$\$[\s\S]*?\$\$/g, '') // 块级数学公式
    .replace(/\$[^$\n]+?\$/g, '')     // 行内数学公式
    .replace(/[#*>\-\[\]()!_|~]/g, ''); // markdown 标记
}

function estimateReadingTime(markdown: string): number {
  const plainText = stripMarkdown(markdown).replace(/\s+/g, '');
  return Math.max(1, Math.ceil(plainText.length / 500));
}

function countWords(markdown: string): number {
  const plainText = stripMarkdown(markdown).trim();

  // 中文字符数
  const chineseChars = (plainText.match(/[一-鿿]/g) || []).length;
  // 英文单词数（移除中文后按空白分词）
  const textWithoutChinese = plainText.replace(/[一-鿿]/g, ' ').replace(/\s+/g, ' ').trim();
  const englishWords = textWithoutChinese ? textWithoutChinese.split(/\s+/).length : 0;

  return chineseChars + englishWords;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="min-h-screen pt-32 pb-24 animate-pulse">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 w-28 bg-surface-container rounded" />
              <div className="h-4 w-24 bg-surface-container rounded" />
            </div>
            <div className="h-10 bg-surface-container rounded w-3/4 mb-6" />
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-full bg-surface-container" />
              <div className="space-y-2">
                <div className="h-4 w-20 bg-surface-container rounded" />
                <div className="h-3 w-32 bg-surface-container rounded" />
              </div>
            </div>
            <div className="aspect-[21/9] bg-surface-container rounded-xl mb-12" />
            <div className="space-y-4 max-w-[720px]">
              <div className="h-5 bg-surface-container rounded w-full" />
              <div className="h-5 bg-surface-container rounded w-5/6" />
              <div className="h-5 bg-surface-container rounded w-4/6" />
              <div className="h-5 bg-surface-container rounded w-full" />
              <div className="h-5 bg-surface-container rounded w-3/4" />
            </div>
          </div>
          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <div className="h-4 w-12 bg-surface-container rounded mb-4" />
            <div className="space-y-3">
              <div className="h-3 bg-surface-container rounded w-full" />
              <div className="h-3 bg-surface-container rounded w-5/6" />
              <div className="h-3 bg-surface-container rounded w-4/6" />
              <div className="h-3 bg-surface-container rounded w-3/6" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 text-center">
        <h1 className="font-display text-[28px] font-bold text-primary mb-4">
          {message.includes('404') || message.includes('不存在') ? '文章不存在' : '加载失败'}
        </h1>
        <p className="text-on-surface-variant mb-8">{message || '无法找到该文章'}</p>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回博客
        </Link>
      </div>
    </div>
  );
}

function PrerequisiteBanner({ article }: { article: ArticleSummary }) {
  return (
    <div className="mb-8 p-5 rounded-xl bg-secondary/5 border-l-4 border-secondary">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-lg flex-shrink-0 mt-0.5">📖</span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-semibold text-primary mb-1">
              建议先阅读：{article.title}
            </p>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              这篇文章基于上文，建议先阅读以更好理解
            </p>
          </div>
        </div>
        <Link
          href={`/blog/${article.slug}`}
          className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded bg-secondary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          去阅读
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function PrevNextNav({
  prev,
  next,
}: {
  prev: Article | null;
  next: Article | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group p-6 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors"
        >
          <span className="flex items-center gap-2 font-display text-[12px] tracking-[0.05em] font-semibold text-outline mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            上一篇
          </span>
          <p className="font-display text-[15px] font-medium text-primary group-hover:text-secondary transition-colors line-clamp-1">
            {prev.title}
          </p>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group p-6 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors text-right"
        >
          <span className="flex items-center justify-end gap-2 font-display text-[12px] tracking-[0.05em] font-semibold text-outline mb-2">
            下一篇
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <p className="font-display text-[15px] font-medium text-primary group-hover:text-secondary transition-colors line-clamp-1">
            {next.title}
          </p>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

function RelatedArticles({ articles }: { articles: ArticleSummary[] }) {
  const [showAll, setShowAll] = useState(false);

  if (articles.length === 0) return null;

  const displayed = showAll ? articles : articles.slice(0, 3);
  const hasMore = articles.length > 3;

  return (
    <section className="mt-24 bg-surface-container-low py-20 border-t border-outline-variant">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-primary mb-12">
          相关文章
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayed.map((article) => (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="group block"
            >
              {article.coverImage && (
                <div className="aspect-video rounded-lg overflow-hidden border border-outline-variant mb-4">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                {article.category && (
                  <>
                    <span className="font-display text-[12px] tracking-[0.05em] font-semibold text-secondary uppercase">
                      {article.category.name}
                    </span>
                    <span className="text-outline-variant">·</span>
                  </>
                )}
                <span className="font-display text-[12px] tracking-[0.05em] font-semibold text-on-surface-variant">
                  {formatDate(article.createdAt)}
                </span>
              </div>

              <h3 className="font-display text-[15px] font-medium text-primary group-hover:text-secondary transition-colors mb-2 line-clamp-2">
                {article.title}
              </h3>

              {article.excerpt && (
                <p className="text-[14px] leading-[20px] text-on-surface-variant line-clamp-2">
                  {article.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-outline-variant text-[14px] font-medium text-primary hover:bg-surface-container transition-colors"
            >
              {showAll ? '收起' : `查看更多（+${articles.length - 3}）`}
              <svg
                className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prevArticle, setPrevArticle] = useState<Article | null>(null);
  const [nextArticle, setNextArticle] = useState<Article | null>(null);
  const [prerequisite, setPrerequisite] = useState<ArticleSummary | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleSummary[]>([]);

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

    // Fetch adjacent articles
    getAdjacentArticles(slug)
      .then(({ prev, next }) => {
        setPrevArticle(prev);
        setNextArticle(next);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });

    // Fetch prerequisite article
    getPrerequisiteArticle(slug)
      .then((article) => {
        setPrerequisite(article);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });

    // Fetch related articles
    getRelatedArticles(slug)
      .then((articles) => {
        setRelatedArticles(articles);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });
  }, [slug]);

  // ------------------------------------------------------------------
  // States: loading / error
  // ------------------------------------------------------------------

  if (loading) return <Skeleton />;
  if (error || !article) return <ErrorState message={error || '无法找到该文章'} />;

  const readingTime = estimateReadingTime(article.contentMd || '');
  const wordCount = countWords(article.contentMd || '');

  return (
    <>
      <main className="pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* ================================================================ */}
            {/* Left: Article content                                               */}
            {/* ================================================================ */}
            <article className="lg:col-span-7 xl:col-span-8 min-w-0">
              {/* ---- Header ---- */}
              <header className="mb-12">
                {/* Back link */}
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 text-sm text-on-surface-variant/60 hover:text-primary transition-colors mb-6 group"
                >
                  <svg
                    className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  返回博客
                </Link>

                {/* Title */}
                <h1 className="font-display text-[28px] sm:text-[32px] md:text-[36px] font-bold text-primary leading-tight tracking-[-0.01em] mb-6">
                  {article.title}
                </h1>

                {/* Prerequisite banner */}
                {prerequisite && <PrerequisiteBanner article={prerequisite} />}

                {/* Metadata row: avatar+author / reading time / date — evenly spread */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                  {/* Avatar + Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                      <span className="text-on-primary-container font-display text-sm font-bold">
                        {(article.author || 'Sean').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-display text-[14px] font-medium text-primary">
                      {article.author || 'Sean'}
                    </span>
                  </div>

                  {/* Reading time */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                    <span className="font-display text-[13px] text-on-surface-variant">
                      {readingTime} 分钟阅读
                    </span>
                  </div>

                  {/* Word count */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-display text-[13px] text-on-surface-variant">
                      {wordCount.toLocaleString()} 字
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-display text-[13px] text-on-surface-variant">
                      {formatDate(article.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Category + Tags row */}
                {(article.category || (article.tags && article.tags.length > 0)) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {article.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded font-display text-[12px] tracking-[0.05em] font-semibold text-secondary bg-secondary-container">
                        {article.category.name}
                      </span>
                    )}
                    {article.tags && article.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-0.5 rounded font-display text-[12px] tracking-[0.05em] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/60"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              {/* ---- Featured Image ---- */}
              {article.coverImage && (
                <div className="mb-12 rounded-xl overflow-hidden border border-outline-variant">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full aspect-[21/9] object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* ---- Article Body ---- */}
              <MarkdownRenderer content={article.contentMd || ''} />

              {/* ---- Prev / Next Navigation ---- */}
              <PrevNextNav prev={prevArticle} next={nextArticle} />
            </article>

            {/* ================================================================ */}
            {/* Right: Sidebar                                                       */}
            {/* ================================================================ */}
            <aside className="hidden lg:block lg:col-span-5 xl:col-span-4">
              <TableOfContents content={article.contentMd || ''} />
            </aside>
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* Related Articles (full-width section)                                   */}
      {/* ==================================================================== */}
      <RelatedArticles articles={relatedArticles} />
    </>
  );
}
