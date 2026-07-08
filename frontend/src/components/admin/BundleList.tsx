"use client";

import { useState } from "react";
import { FileBundle } from "@/types";
import {
  adminPublishBundle,
  adminUnpublishBundle,
  adminDeleteBundle,
} from "@/lib/api";

interface Props {
  bundles: FileBundle[];
  onRefresh: () => void;
}

export default function BundleList({ bundles, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function handlePublish(bundle: FileBundle) {
    setActionLoading(bundle.id);
    try {
      if (bundle.status === "PUBLISHED") {
        await adminUnpublishBundle(bundle.id);
      } else {
        await adminPublishBundle(bundle.id);
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失败";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(bundle: FileBundle) {
    if (!confirm(`确定删除 Bundle「${bundle.name}」？`)) return;
    setActionLoading(bundle.id);
    try {
      await adminDeleteBundle(bundle.id);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失败";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  }

  const statusLabel: Record<string, string> = {
    PUBLISHED: "已发布",
    UNPUBLISHED: "未发布",
  };

  const statusStyle: Record<string, string> = {
    PUBLISHED: "bg-secondary-container text-on-secondary-container",
    UNPUBLISHED: "bg-surface-container-high text-on-surface-variant",
  };

  return (
    <div>
      {bundles.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-outline-variant p-12 text-center text-on-surface-variant">
          <p className="text-lg mb-2">暂无 Bundle 数据</p>
          <p className="text-sm">点击「上传 Bundle」添加文件目录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white rounded-lg border border-outline-variant p-5 flex flex-col"
            >
              {/* 名称 */}
              <h3 className="font-display font-semibold text-on-surface text-lg mb-1">
                {bundle.name}
              </h3>

              {/* 描述 */}
              {bundle.description && (
                <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
                  {bundle.description}
                </p>
              )}

              {/* 元信息 */}
              <div className="flex items-center gap-3 mt-auto mb-4">
                <span className="text-xs text-on-surface-variant">
                  {bundle.fileCount ?? 0} 个文件
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    statusStyle[bundle.status] ?? "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {statusLabel[bundle.status] || bundle.status}
                </span>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/50">
                <button
                  onClick={() => handlePublish(bundle)}
                  disabled={actionLoading === bundle.id}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                    bundle.status === "PUBLISHED"
                      ? "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      : "border-secondary text-secondary hover:bg-secondary-container/30"
                  }`}
                >
                  {actionLoading === bundle.id
                    ? "..."
                    : bundle.status === "PUBLISHED"
                    ? "取消发布"
                    : "发布"}
                </button>

                <button
                  onClick={() => handleDelete(bundle)}
                  disabled={actionLoading === bundle.id}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
