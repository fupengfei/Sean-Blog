"use client";

import { useState, useEffect } from "react";
import { FileBundle } from "@/types";
import {
  adminPublishBundle,
  adminUnpublishBundle,
  adminDeleteBundle,
  adminUpdateBundle,
  adminToggleBundleFeature,
} from "@/lib/api";

interface Props {
  bundles: FileBundle[];
  onRefresh: () => void;
}

export default function BundleList({ bundles, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingBundle, setEditingBundle] = useState<FileBundle | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("SKILL");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (editingBundle) {
      setEditName(editingBundle.name);
      setEditDescription(editingBundle.description || "");
      setEditType(editingBundle.type || "SKILL");
      setEditError("");
    }
  }, [editingBundle]);

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

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");

    if (!editName.trim()) {
      setEditError("名称不能为空");
      return;
    }
    if (!editingBundle) return;

    setEditSubmitting(true);
    try {
      await adminUpdateBundle(editingBundle.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        type: editType.trim() || "SKILL",
      });
      setEditingBundle(null);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "更新失败";
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleToggleFeature(bundle: FileBundle) {
    setActionLoading(bundle.id);
    try {
      await adminToggleBundleFeature(bundle.id);
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
                {bundle.isFeatured && (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                    ⭐ 精选
                  </span>
                )}
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/50">
                <button
                  onClick={() => setEditingBundle(bundle)}
                  disabled={actionLoading === bundle.id}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition-colors"
                >
                  编辑
                </button>
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
                  onClick={() => handleToggleFeature(bundle)}
                  disabled={actionLoading === bundle.id}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                    bundle.isFeatured
                      ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title={bundle.isFeatured ? "取消精选" : "设为精选"}
                >
                  {actionLoading === bundle.id ? "..." : bundle.isFeatured ? "⭐ 取消精选" : "☆ 精选"}
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

      {/* 编辑弹窗 */}
      {editingBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditingBundle(null)}
          />
          <div className="relative bg-white rounded-lg border border-outline-variant p-6 w-full max-w-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-on-surface">
                编辑 Bundle
              </h2>
              <button
                onClick={() => setEditingBundle(null)}
                className="text-on-surface-variant hover:text-on-surface text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
                  {editError}
                </div>
              )}

              {/* 名称 */}
              <div>
                <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
                  描述
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
                />
              </div>

              {/* 类型 */}
              <div>
                <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
                  类型
                </label>
                <input
                  type="text"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {/* 提交 */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-primary text-white rounded px-6 py-2.5 font-ui font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBundle(null)}
                  className="px-6 py-2.5 rounded border border-outline-variant text-on-surface-variant font-ui font-medium hover:bg-surface-container transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
