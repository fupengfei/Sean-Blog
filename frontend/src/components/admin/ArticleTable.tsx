"use client";

import { useState } from "react";
import {
  adminUpdateArticleStatus,
  adminToggleArticleFeature,
  adminDeleteArticle,
} from "@/lib/api";
import type { Article } from "@/types";

interface Props {
  articles: Article[];
  onRefresh: () => void;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "草稿",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  PUBLISHED: {
    label: "已发布",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ArticleTable({ articles, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setActionLoading(id);
    try {
      await adminUpdateArticleStatus(id, newStatus);
      onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "操作失败");
      } else {
        alert("操作失败");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeature = async (id: string) => {
    setActionLoading(id);
    try {
      await adminToggleArticleFeature(id);
      onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "操作失败");
      } else {
        alert("操作失败");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await adminDeleteArticle(id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "删除失败");
      } else {
        alert("删除失败");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-container mb-4">
          <span className="text-4xl">📝</span>
        </div>
        <p className="text-on-surface-variant font-ui text-sm">暂无文章数据</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                标题
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                作者
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                分类
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                状态
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                精选
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                创建时间
              </th>
              <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const status = STATUS_MAP[article.status] || STATUS_MAP.DRAFT;
              const isLoading = actionLoading === article.id;
              return (
                <tr
                  key={article.id}
                  className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-ui text-on-surface">
                    {article.title}
                  </td>
                  <td className="py-3 px-4 text-sm font-ui text-on-surface-variant">
                    {article.author || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm font-ui text-on-surface-variant">
                    {article.category?.name || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-ui ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {article.isFeatured ? (
                      <span className="text-xs text-secondary font-ui font-medium">
                        精选
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant/50 font-ui">
                        -
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-ui text-on-surface-variant">
                    {formatDate(article.publishDate || article.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/admin/articles/edit/${article.id}`}
                        className="text-xs px-2 py-1 rounded border border-outline-variant text-secondary hover:bg-secondary-container transition-colors"
                      >
                        编辑
                      </a>

                      <button
                        onClick={() =>
                          handleStatusChange(article.id, article.status)
                        }
                        disabled={isLoading}
                        className="text-xs px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading
                          ? "..."
                          : article.status === "PUBLISHED"
                            ? "取消发布"
                            : "发布"}
                      </button>

                      <button
                        onClick={() => handleToggleFeature(article.id)}
                        disabled={isLoading}
                        className="text-xs px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading
                          ? "..."
                          : article.isFeatured
                            ? "取消精选"
                            : "精选"}
                      </button>

                      <button
                        onClick={() => setDeleteConfirm(article.id)}
                        disabled={isLoading}
                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteConfirm(null)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-lg p-6 border border-outline-variant shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-display font-semibold text-on-surface mb-3">
              确认删除
            </h3>
            <p className="text-sm text-on-surface-variant font-ui mb-6">
              删除后文章将被逻辑删除，不可再访问。关联的文件资源将被物理删除，此操作不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-ui rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading !== null}
                className="px-4 py-2 text-sm font-ui rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading !== null ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
