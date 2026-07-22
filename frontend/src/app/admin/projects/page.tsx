"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types";
import { adminGetProjects } from "@/lib/api";
import ProjectTable from "@/components/admin/ProjectTable";
import ProjectEditor from "@/components/admin/ProjectEditor";

/**
 * 项目管理列表页（/admin/projects）
 *
 * 数据获取：客户端 fetch（adminGetProjects），挂载时加载全部项目
 *
 * 功能：
 * - 新建项目按钮 → 打开 Modal（内嵌 ProjectEditor）
 * - ProjectTable 列表展示（含编辑 / 删除操作）
 * - 编辑操作通过 ProjectTable 内部路由跳转处理
 *
 * 状态覆盖：
 * - loading：文字 "加载中..."
 * - error：红色错误提示
 * - normal：ProjectTable + 可能的创建 Modal
 */
export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function fetchProjects() {
    setLoading(true);
    setError("");
    try {
      const data = await adminGetProjects();
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "加载项目列表失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  function handleCreateSuccess() {
    setShowModal(false);
    fetchProjects();
  }

  function handleRefresh() {
    fetchProjects();
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold text-on-surface">
          项目管理
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white rounded px-4 py-2 font-ui font-medium text-sm hover:bg-primary-container transition-colors"
        >
          新建项目
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <div className="text-on-surface-variant text-sm">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg border border-outline-variant">
          <ProjectTable projects={projects} onRefresh={handleRefresh} />
        </div>
      )}

      {/* 新建弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          {/* 弹窗内容 */}
          <div className="relative bg-white rounded-lg border border-outline-variant p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-on-surface">
                新建项目
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <ProjectEditor onSuccess={handleCreateSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
