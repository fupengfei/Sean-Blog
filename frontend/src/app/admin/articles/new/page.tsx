"use client";

import { useRouter } from "next/navigation";
import ArticleEditor from "@/components/admin/ArticleEditor";

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
