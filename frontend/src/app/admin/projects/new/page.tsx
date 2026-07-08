"use client";

import { useRouter } from "next/navigation";
import ProjectEditor from "@/components/admin/ProjectEditor";

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
