"use client";

import { useRouter } from "next/navigation";
import ProjectEditor from "@/components/admin/ProjectEditor";

/**
 * 新建项目页（/admin/projects/new）
 *
 * 数据获取：无初始数据请求，ProjectEditor 组件内部处理表单提交
 *
 * 行为：保存成功后回调 handleSuccess → 跳转到 /admin/projects 列表页
 *
 * 页面结构：标题 + ProjectEditor（宽度限制 max-w-2xl）
 */
export default function AdminProjectNewPage() {
  const router = useRouter();

  function handleSuccess() {
    router.push("/admin/projects");
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        新建项目
      </h1>

      <div className="bg-white rounded-lg border border-outline-variant p-6 max-w-2xl">
        <ProjectEditor onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
