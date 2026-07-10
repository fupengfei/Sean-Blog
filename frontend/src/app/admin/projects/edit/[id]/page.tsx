"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Project } from "@/types";
import { adminGetProjects } from "@/lib/api";
import ProjectEditor from "@/components/admin/ProjectEditor";

export default function AdminProjectEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      setError("");
      try {
        const projects = await adminGetProjects();
        const found = projects.find((p) => p.id === id);
        if (!found) {
          setError("项目不存在");
        } else {
          setProject(found);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "加载项目失败";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  function handleSuccess() {
    router.push("/admin/projects");
  }

  return (
    <div>
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link
          href="/admin/projects"
          className="hover:text-primary transition-colors"
        >
          项目管理
        </Link>
        <span>/</span>
        <span className="text-on-surface">编辑项目</span>
      </div>

      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        编辑项目
      </h1>

      {/* 加载中 */}
      {loading && (
        <div className="text-on-surface-variant text-sm">加载中...</div>
      )}

      {/* 错误提示 */}
      {!loading && error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 编辑表单 */}
      {!loading && project && (
        <div className="bg-white rounded-lg border border-outline-variant p-6 max-w-2xl">
          <ProjectEditor project={project} onSuccess={handleSuccess} />
        </div>
      )}
    </div>
  );
}
