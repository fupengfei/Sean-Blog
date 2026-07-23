'use client';

import { useEffect, useState } from 'react';
import { getArticles, getCategories } from '@/lib/api';
import type { Article, Category } from '@/types';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import FilterBar from '@/components/blog/FilterBar';
import NewsletterSection from '@/components/blog/NewsletterSection';
import ArticleCard from '@/components/blog/ArticleCard';
import ArticleListItem from '@/components/blog/ArticleListItem';
import Pagination from '@/components/blog/Pagination';

/** 每页文章数 */
const PAGE_SIZE = 10;

/** 视图模式：卡片（瀑布流）或列表 */
type ViewMode = 'card' | 'list';

/**
 * 博客列表页（/blog）
 *
 * 数据获取：客户端 fetch（getArticles + getCategories），分类和分页变化时重新请求
 *
 * 核心功能：
 * - 分类筛选：通过 FilterBar 选择分类，切换时回到第 1 页
 * - 视图切换：卡片视图（CSS columns 瀑布流，首篇突出）和列表视图
 * - 分页：Pagination 组件，总页数 <= 1 时不显示
 *
 * 状态覆盖：
 * - loading：骨架屏（首篇特色骨架 + 瀑布列骨架）
 * - error：红色错误卡片 + 重试按钮
 * - empty：虚线占位卡片，根据是否有分类筛选显示不同文案
 * - normal：首篇大卡片 + 其余瀑布流 / 列表
 */
export default function BlogListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Fetch categories once
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Fetch articles when category or page changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    getArticles({
      page,
      size: PAGE_SIZE,
      ...(selectedCategory !== null ? { category: selectedCategory } : {}),
    })
      .then((result) => {
        setArticles(result.list);
        setTotalPages(Math.ceil(result.total / PAGE_SIZE));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载文章失败');
        setArticles([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCategory, page]);

  // Reset to page 1 when category changes
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto">
        {/* Page header — 匹配 v2_1 设计稿 */}
        <header className="mb-16 border-l-4 border-primary pl-6 py-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4 tracking-tight">
            博客专栏
          </h1>
          <p className="text-base text-on-surface-variant max-w-3xl leading-relaxed">
            探索现代软件工程的前沿技术，沉淀架构设计的实践心得。这里不仅有代码，更有关于技术演进与解决问题的思考。
          </p>
        </header>

        {/* Category filters + view toggle — 匹配 v2_1 设计稿 */}
        {categories.length > 0 && (
          <div className="mb-12 border-b border-outline-variant pb-8">
            <div className="flex items-center justify-between">
              <FilterBar
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
              />

              {/* View mode toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-outline-variant rounded-lg p-1 shrink-0 ml-8">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'card'
                      ? 'bg-primary text-white'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                  title="卡片视图"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                  title="列表视图"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setPage(1);
              }}
              className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-container transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Loading state — masonry skeleton */}
        {loading && !error && (
          <div>
            {/* Featured skeleton */}
            <div className="rounded-lg border border-outline-variant bg-surface-container-low border-l-[3px] border-l-primary/40 p-6 md:p-10 mb-8 animate-pulse">
              <div className="h-4 bg-surface-container rounded w-1/4 mb-3" />
              <div className="h-7 bg-surface-container rounded w-3/4 mb-3" />
              <div className="h-3 bg-surface-container rounded w-full mb-1" />
              <div className="h-3 bg-surface-container rounded w-2/3 mb-4" />
              <div className="flex gap-1.5">
                <div className="h-5 bg-surface-container rounded w-12" />
                <div className="h-5 bg-surface-container rounded w-16" />
              </div>
            </div>
            {/* Regular skeletons — masonry columns */}
            <div className="columns-1 md:columns-2 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-outline-variant bg-white p-6 animate-pulse mb-8 break-inside-avoid"
                  style={{ minHeight: i === 1 ? '200px' : i === 2 ? '260px' : '180px' }}
                >
                  <div className="h-4 bg-surface-container rounded w-1/4 mb-3" />
                  <div className="h-5 bg-surface-container rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-container rounded w-full mb-1" />
                  <div className="h-3 bg-surface-container rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — staggered placeholders */}
        {!loading && !error && articles.length === 0 && (
          <div className="columns-1 md:columns-2 gap-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border-2 border-dashed border-outline-variant bg-white flex flex-col items-center justify-center p-12 text-center mb-8 break-inside-avoid"
                style={{ minHeight: i === 1 ? '280px' : '360px' }}
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
                  {selectedCategory !== null ? '该分类下暂无文章' : '文章即将发布'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Article display */}
        {!loading && !error && articles.length > 0 && (
          <>
            {viewMode === 'card' ? (
              <div>
                {/* Featured first article — spans full width, horizontal layout on desktop */}
                <div className="mb-8">
                  <ArticleCard
                    article={articles[0]}
                    variant="featured"
                    index={0}
                  />
                </div>

                {/* Remaining articles — CSS columns masonry for staggered layout */}
                {articles.length > 1 && (
                  <div className="columns-1 md:columns-2 gap-8">
                    {articles.slice(1).map((article, i) => (
                      <div key={article.id} className="mb-8 break-inside-avoid">
                        <ArticleCard article={article} index={i + 1} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleListItem key={article.id} article={article} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </main>
      <NewsletterSection />
      <Footer />
    </>
  );
}
