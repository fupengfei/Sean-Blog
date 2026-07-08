"use client";

import { useEffect, useState } from "react";
import { ContactRecord } from "@/types";
import { adminGetContacts } from "@/lib/api";

const PAGE_SIZE = 20;

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState(""); // "" = 全部, "MAIL", "RESUME"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchContacts(p: number, type: string) {
    setLoading(true);
    setError("");
    try {
      const res = await adminGetContacts({
        page: p,
        size: PAGE_SIZE,
        type: type || undefined,
      });
      setContacts(res.list);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "加载联系记录失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts(page, typeFilter);
  }, [page, typeFilter]);

  function handleTypeChange(newType: string) {
    setTypeFilter(newType);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const typeBadgeStyle: Record<string, string> = {
    MAIL: "bg-blue-50 text-blue-700 border-blue-200",
    RESUME: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const typeLabel: Record<string, string> = {
    MAIL: "邮件",
    RESUME: "简历",
  };

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold text-on-surface">
          联系记录
        </h1>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-ui font-medium text-on-surface">
          类型筛选：
        </label>
        <div className="flex gap-2">
          {["", "MAIL", "RESUME"].map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1.5 rounded text-sm font-ui border transition-colors ${
                typeFilter === t
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {t === "" ? "全部" : typeLabel[t] || t}
            </button>
          ))}
        </div>
        {total > 0 && (
          <span className="text-sm text-on-surface-variant ml-auto">
            共 {total} 条记录
          </span>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 表格 */}
      {loading ? (
        <div className="text-on-surface-variant text-sm">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg border border-outline-variant overflow-x-auto">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">公司名</th>
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">IP 地址</th>
                <th className="px-4 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-on-surface-variant"
                  >
                    暂无联系记录
                  </td>
                </tr>
              ) : (
                contacts.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-outline-variant/50 hover:bg-surface-container"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                          typeBadgeStyle[record.type] ??
                          "bg-surface-container-high text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {typeLabel[record.type] || record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {record.companyName || "-"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {record.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                      {record.ipAddress || "-"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {formatTime(record.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* 分页器 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/50">
              <span className="text-xs text-on-surface-variant">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded text-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // 只显示当前页附近的页码
                    return (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 2
                    );
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0) {
                      const prev = arr[idx - 1];
                      if (p - prev > 1) {
                        acc.push("...");
                      }
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-xs text-on-surface-variant"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item as number)}
                        className={`w-8 h-8 rounded text-xs border transition-colors ${
                          page === item
                            ? "bg-primary text-white border-primary"
                            : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded text-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
