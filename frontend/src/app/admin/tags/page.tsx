"use client";

import { useEffect, useState } from "react";
import {
  adminGetTags,
  adminCreateTag,
  adminUpdateTag,
  adminDeleteTag,
} from "@/lib/api";
import type { Tag } from "@/types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal 相关状态
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalSlug, setModalSlug] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminGetTags();
      setTags(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "加载标签失败");
      } else {
        setError("加载标签失败");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // 打开新建 Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setModalName("");
    setModalSlug("");
    setModalError("");
    setShowModal(true);
  };

  // 打开编辑 Modal
  const handleOpenEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setModalName(tag.name);
    setModalSlug(tag.slug);
    setModalError("");
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!modalName.trim()) {
      setModalError("名称不能为空");
      return;
    }
    if (!modalSlug.trim()) {
      setModalError("Slug 不能为空");
      return;
    }

    setModalLoading(true);
    try {
      if (editingId !== null) {
        await adminUpdateTag(editingId, modalName.trim(), modalSlug.trim());
      } else {
        await adminCreateTag(modalName.trim(), modalSlug.trim());
      }
      setShowModal(false);
      fetchTags();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message || "操作失败");
      } else {
        setModalError("操作失败");
      }
    } finally {
      setModalLoading(false);
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    setDeleteLoading(true);
    try {
      await adminDeleteTag(id);
      setDeleteConfirm(null);
      fetchTags();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "删除失败");
      } else {
        alert("删除失败");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold text-on-surface">
          标签管理
        </h1>
        <button
          onClick={handleOpenCreate}
          className="bg-primary text-white rounded px-5 py-2.5 font-ui font-medium text-sm hover:bg-primary-container transition-colors"
        >
          + 新建标签
        </button>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-on-surface-variant text-sm py-8 text-center">
          加载中...
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-container mb-4">
            <span className="text-4xl">🏷️</span>
          </div>
          <p className="text-on-surface-variant font-ui text-sm">暂无标签</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-outline-variant">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                  名称
                </th>
                <th className="py-3 px-4 text-sm font-ui font-medium text-on-surface-variant">
                  Slug
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
              {tags.map((tag) => (
                <tr
                  key={tag.id}
                  className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-ui text-on-surface">
                    {tag.name}
                  </td>
                  <td className="py-3 px-4 text-sm font-ui text-on-surface-variant font-mono">
                    {tag.slug}
                  </td>
                  <td className="py-3 px-4 text-sm font-ui text-on-surface-variant">
                    {formatDate(tag.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(tag)}
                        className="text-xs px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(tag.id)}
                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 bg-white rounded-lg p-6 border border-outline-variant shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-display font-semibold text-on-surface mb-4">
              {editingId !== null ? "编辑标签" : "新建标签"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
                  名称
                </label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="输入标签名称"
                  className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={modalSlug}
                  onChange={(e) => setModalSlug(e.target.value)}
                  placeholder="e.g. react"
                  className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {modalError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-ui rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 text-sm font-ui rounded bg-primary text-white hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 bg-white rounded-lg p-6 border border-outline-variant shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-display font-semibold text-on-surface mb-3">
              确认删除
            </h3>
            <p className="text-sm text-on-surface-variant font-ui mb-6">
              确定要删除该标签吗？此操作不可撤销。
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
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-ui rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
