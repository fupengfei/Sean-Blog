'use client';

import { useEffect, useState } from 'react';
import { getArticles, getCategories } from '@/lib/api';
import type { Article, Category } from '@/types';
import FilterBar from '@/components/blog/FilterBar';
import ArticleCard from '@/components/blog/ArticleCard';
import Pagination from '@/components/blog/Pagination';

const PAGE_SIZE = 10;

export default function BlogListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <section className="py-12 md:py-16 bg-surface-container-low">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-6">
            博客
          </h1>
          {categories.length > 0 && (
            <FilterBar
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          )}
        </div>
      </section>

      {/* Content area */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
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

          {/* Loading state */}
          {loading && !error && (
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
          {!loading && !error && articles.length === 0 && (
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
                    {selectedCategory !== null ? '该分类下暂无文章' : '文章即将发布'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Article grid */}
          {!loading && !error && articles.length > 0 && (
            <>
              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${
                  articles.length < 2 ? 'justify-center' : ''
                }`}
              >
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

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
        </div>
      </section>
    </div>
  );
}
