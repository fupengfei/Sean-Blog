"use client";

import { useRouter } from "next/navigation";
import ArticleEditor from "@/components/admin/ArticleEditor";

/**
 * 新建文章页（/admin/articles/new）
 *
 * 数据获取：无初始数据请求，ArticleEditor 组件内部处理表单提交和 Markdown 编辑
 *
 * 行为：ArticleEditor 保存成功后回调 handleSuccess → 跳转到 /admin/articles 列表页
 *
 * 页面结构：标题 + ArticleEditor 编辑器（宽度限制 max-w-2xl）
 */
export default function AdminArticleNewPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/admin/articles");
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        新建文章
      </h1>

      <div className="max-w-2xl bg-white rounded-lg p-6 border border-outline-variant">
        <ArticleEditor onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
