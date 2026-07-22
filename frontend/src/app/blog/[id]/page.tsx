'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getArticleById, getNextArticle, getPrerequisiteArticle, getRelatedArticles } from '@/lib/api';
import { useChat } from '@/components/chat/ChatProvider';
import type { Article, ArticleSummary } from '@/types';
import MarkdownRenderer from '@/components/blog/MarkdownRenderer';
import TableOfContents from '@/components/blog/TableOfContents';

// ---------------------------------------------------------------------------
// 工具函数：日期格式化、Markdown 纯文本提取、阅读时间估算、字数统计
// ---------------------------------------------------------------------------

/**
 * 将 ISO 日期字符串格式化为中文日期（如 "2026年7月22日"）
 */
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
// 子组件：骨架屏、错误状态、前置文章 Banner、下一篇导航、相关文章
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
          <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-semibold text-primary mb-1">
              推荐先读：{article.title}
            </p>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              这篇文章是本文的基础，先读它能更好地理解下面的内容
            </p>
          </div>
        </div>
        <Link
          href={`/blog/${article.id}`}
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

function NextArticleNav({ next }: { next: ArticleSummary | null }) {
  if (!next) return null;

  return (
    <div className="mt-16">
      <Link
        href={`/blog/${next.id}`}
        className="group p-6 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-between"
      >
        <div>
          <span className="flex items-center gap-2 font-display text-[12px] tracking-[0.05em] font-semibold text-outline mb-2">
            下一篇
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <p className="font-display text-[15px] font-medium text-primary group-hover:text-secondary transition-colors line-clamp-1">
            {next.title}
          </p>
        </div>
        <svg className="w-5 h-5 text-outline flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
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

        {/* Masonry layout — staggered cards for visual rhythm */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 lg:gap-8">
          {displayed.map((article, i) => {
            const accentBorders = [
              'border-l-primary/60', 'border-l-secondary/50', 'border-l-primary/35',
              'border-l-secondary/30', 'border-l-primary/50', 'border-l-secondary/40',
            ];
            const accent = accentBorders[i % accentBorders.length];

            return (
            <div key={article.id} className="mb-6 lg:mb-8 break-inside-avoid">
              <Link
                href={`/blog/${article.id}`}
                className={`group block rounded-lg border border-outline-variant bg-white overflow-hidden border-l-[2px] ${accent} transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(0,32,69,0.08)]`}
              >
                <div className="p-5 md:p-6">
                  {/* Category + Date */}
                  <div className="flex items-center gap-3 mb-3">
                    {article.category && (
                      <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-secondary text-xs font-semibold">
                        {article.category.name}
                      </span>
                    )}
                    <span className="text-xs text-on-surface-variant/60">
                      {formatDate(article.publishDate || article.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg md:text-xl font-semibold text-primary mb-2 group-hover:text-secondary transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4 line-clamp-3">
                    {article.excerpt || '暂无摘要'}
                  </p>

                  {/* CTA */}
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary/80 group-hover:text-secondary group-hover:gap-2 transition-all duration-300">
                    阅读全文
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
            );
          })}
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

/**
 * 文章详情页（/blog/[id]）
 *
 * 数据获取：客户端 fetch，根据 URL 参数 id 并行请求文章主体、前置文章、下一篇、相关文章
 *
 * 页面布局：左侧主内容区（文章标题/元数据/正文/下一篇导航）+ 右侧目录栏（TableOfContents）
 *
 * 状态覆盖：
 * - loading：Skeleton 骨架屏（含标题、作者、内容区域）
 * - error：ErrorState 组件（区分 404 和通用错误，提供返回链接）
 * - normal：完整文章渲染 + 相关文章底部区域
 *
 * 特色功能：
 * - 前置文章 Banner（管理员配置，引导阅读顺序）
 * - 下一篇导航（管理员手动指定）
 * - 相关文章（双向关联，瀑布流卡片展示，支持展开/收起）
 * - 阅读时间估算和字数统计
 */
export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;
  const { setArticleContext } = useChat();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nextArticle, setNextArticle] = useState<ArticleSummary | null>(null);
  const [prerequisite, setPrerequisite] = useState<ArticleSummary | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    if (!articleId) return;

    setLoading(true);
    setError(null);

    getArticleById(articleId)
      .then(setArticle)
      .catch((err) => {
        const message = err instanceof Error ? err.message : '加载文章失败';
        setError(message);
        setArticle(null);
      })
      .finally(() => setLoading(false));

    // Fetch next article（管理员手动配置）
    getNextArticle(articleId)
      .then((next) => {
        setNextArticle(next);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });

    // Fetch prerequisite article
    getPrerequisiteArticle(articleId)
      .then((article) => {
        setPrerequisite(article);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });

    // Fetch related articles
    getRelatedArticles(articleId)
      .then((articles) => {
        setRelatedArticles(articles);
      })
      .catch(() => {
        // Non-critical; silently ignore
      });
  }, [articleId]);

  // 将当前文章同步给全局 AI 助手（文章上下文感知）；离开文章页时清除
  useEffect(() => {
    if (article) {
      setArticleContext({ id: article.id, title: article.title });
    }
    return () => setArticleContext(null);
  }, [article, setArticleContext]);

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
                      {formatDate(article.publishDate || article.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Category + Tags */}
                {(article.category || (article.tags && article.tags.length > 0)) && (
                  <div className="space-y-2">
                    {article.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded font-display text-[12px] tracking-[0.05em] font-semibold text-secondary bg-secondary-container">
                        {article.category.name}
                      </span>
                    )}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {article.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2.5 py-0.5 rounded font-display text-[12px] tracking-[0.05em] font-semibold text-on-surface-variant bg-surface-container-low border border-outline-variant/60"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
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

              {/* ---- Next Article Navigation（管理员配置） ---- */}
              <NextArticleNav next={nextArticle} />
            </article>

            {/* ================================================================ */}
            {/* Right: Sidebar                                                       */}
            {/* ================================================================ */}
            <aside className="hidden lg:block lg:col-span-5 xl:col-span-4">
              <TableOfContents
                content={article.contentMd || ''}
                prerequisite={prerequisite}
                relatedArticles={relatedArticles}
              />
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
