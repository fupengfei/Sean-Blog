"use client";

import { useState } from "react";
import { Project } from "@/types";
import {
  adminToggleProjectFeature,
  adminUpdateProjectSort,
  adminDeleteProject,
} from "@/lib/api";

interface Props {
  projects: Project[];
  onRefresh: () => void;
}

/**
 * 项目管理表格
 *
 * Admin 项目列表页的数据表格，支持以下操作：
 * - **精选切换**：星标按钮切换 isFeatured（★/☆）
 * - **排序调整**：上移/下移按钮调整 sortOrder
 * - **编辑**：跳转到编辑页 `/admin/projects/edit/{id}`
 * - **删除**：带 confirm 确认的物理删除
 *
 * 空数据时显示「暂无项目数据」。
 */
export default function ProjectTable({ projects, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleToggleFeature(project: Project) {
    setActionLoading(project.id);
    try {
      await adminToggleProjectFeature(project.id);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失败";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMoveUp(project: Project) {
    if (project.sortOrder <= 0) return;
    setActionLoading(project.id);
    try {
      await adminUpdateProjectSort(project.id, project.sortOrder - 1);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失败";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMoveDown(project: Project) {
    setActionLoading(project.id);
    try {
      await adminUpdateProjectSort(project.id, project.sortOrder + 1);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失败";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(project: Project) {
    if (!confirm(`确定删除项目「${project.title}」？`)) return;
    setActionLoading(project.id);
    try {
      await adminDeleteProject(project.id);
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
    DRAFT: "草稿",
    DELETED: "已删除",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-ui">
        <thead>
          <tr className="border-b border-outline-variant text-left text-on-surface-variant">
            <th className="px-4 py-3 font-medium">标题</th>
            <th className="px-4 py-3 font-medium">描述</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">排序</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                暂无项目数据
              </td>
            </tr>
          ) : (
            projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-outline-variant/50 hover:bg-surface-container"
              >
                <td className="px-4 py-3 font-medium text-on-surface">
                  {project.title}
                </td>
                <td className="px-4 py-3 text-on-surface-variant max-w-xs truncate">
                  {project.description || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      project.status === "PUBLISHED"
                        ? "bg-secondary-container text-on-secondary-container"
                        : project.status === "DRAFT"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {statusLabel[project.status] || project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {project.sortOrder}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {/* 精选切换 */}
                    <button
                      onClick={() => handleToggleFeature(project)}
                      disabled={actionLoading === project.id}
                      className={`px-2 py-1 rounded text-xs border transition-colors disabled:opacity-50 ${
                        project.isFeatured
                          ? "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}
                      title={project.isFeatured ? "取消精选" : "设为精选"}
                    >
                      {project.isFeatured ? "★" : "☆"}
                    </button>

                    {/* 排序上调 */}
                    <button
                      onClick={() => handleMoveUp(project)}
                      disabled={actionLoading === project.id || project.sortOrder <= 0}
                      className="px-2 py-1 rounded text-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      title="上移"
                    >
                      ↑
                    </button>

                    {/* 排序下调 */}
                    <button
                      onClick={() => handleMoveDown(project)}
                      disabled={actionLoading === project.id}
                      className="px-2 py-1 rounded text-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      title="下移"
                    >
                      ↓
                    </button>

                    {/* 编辑 */}
                    <a
                      href={`/admin/projects/edit/${project.id}`}
                      className="px-2 py-1 rounded text-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    >
                      编辑
                    </a>

                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(project)}
                      disabled={actionLoading === project.id}
                      className="px-2 py-1 rounded text-xs border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
