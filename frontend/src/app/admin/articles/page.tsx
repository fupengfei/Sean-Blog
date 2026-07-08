"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetArticles } from "@/lib/api";
import ArticleTable from "@/components/admin/ArticleTable";
import type { Article } from "@/types";

const PAGE_SIZE = 10;

export default function AdminArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchArticles = async (p: number, kw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminGetArticles({
        page: p,
        size: PAGE_SIZE,
        keyword: kw || undefined,
      });
      setArticles(res.list);
      setTotal(res.total);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "加载文章列表失败");
      } else {
        setError("加载文章列表失败");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(page, keyword);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1);
    fetchArticles(1, keyword);
  };

  const handleRefresh = () => {
    fetchArticles(page, keyword);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold text-on-surface">
          文章管理
        </h1>
        <button
          onClick={() => router.push("/admin/articles/new")}
          className="bg-primary text-white rounded px-5 py-2.5 font-ui font-medium text-sm hover:bg-primary-container transition-colors"
        >
          + 新建文章
        </button>
      </div>

      {/* 搜索框 */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="搜索文章标题或内容..."
          className="border border-outline-variant rounded px-4 py-2 w-full max-w-sm text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-ui rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          搜索
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 表格 */}
      {loading ? (
        <div className="text-on-surface-variant text-sm py-8 text-center">
          加载中...
        </div>
      ) : (
        <>
          <ArticleTable articles={articles} onRefresh={handleRefresh} />

          {/* 分页器 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm font-ui rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm font-ui rounded border transition-colors
                    ${
                      p === page
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}
                >
                  {p}
                </button>
              ))}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm font-ui rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
