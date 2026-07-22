"use client";

import { useState, useRef } from "react";
import { Project } from "@/types";
import { adminCreateProject, adminUpdateProject } from "@/lib/api";

interface Props {
  onSuccess: () => void;
  project?: Project; // 可选：编辑模式时传入已有项目
}

/**
 * 项目编辑器（创建 + 编辑复用）
 *
 * 通过 `project` prop 区分模式：
 * - `project` 为 undefined → 创建模式
 * - `project` 传入现有数据 → 编辑模式
 *
 * 表单字段：
 * - **标题**：必填
 * - **描述**：选填，多行文本
 * - **项目 URL / GitHub URL**：选填，type=url 输入框
 * - **标签**：逗号分隔的文本输入，提交时转换为 JSON 数组字符串（如 `"React,TypeScript"` → `["React","TypeScript"]`）
 * - **精选**：checkbox 切换
 * - **封面图**：文件上传，编辑模式下提示已有封面图
 *
 * 提交通过 FormData 发送，成功后调用 `onSuccess()`。
 */
export default function ProjectEditor({ onSuccess, project }: Props) {
  const isEdit = !!project;

  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [url, setUrl] = useState(project?.url ?? "");
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? "");
  const [tags, setTags] = useState(() => {
    if (!project?.tags) return "";
    try {
      const parsed = JSON.parse(project.tags);
      return Array.isArray(parsed) ? parsed.join(",") : project.tags;
    } catch {
      return project.tags;
    }
  });
  const [isFeatured, setIsFeatured] = useState(project?.isFeatured ?? false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());

      if (url.trim()) {
        formData.append("url", url.trim());
      }
      if (githubUrl.trim()) {
        formData.append("githubUrl", githubUrl.trim());
      }

      // 处理标签：逗号分隔 → JSON 数组字符串
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      formData.append("tags", JSON.stringify(tagList));

      formData.append("isFeatured", String(isFeatured));

      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      if (isEdit && project) {
        await adminUpdateProject(project.id, formData);
      } else {
        await adminCreateProject(formData);
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "提交失败";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 标题 */}
      <div>
        <label
          htmlFor="project-title"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          标题 <span className="text-red-500">*</span>
        </label>
        <input
          id="project-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="项目标题"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* 描述 */}
      <div>
        <label
          htmlFor="project-desc"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          描述
        </label>
        <textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="项目描述"
          rows={4}
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
        />
      </div>

      {/* URL */}
      <div>
        <label
          htmlFor="project-url"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          项目 URL
        </label>
        <input
          id="project-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* GitHub URL */}
      <div>
        <label
          htmlFor="project-gh"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          GitHub URL
        </label>
        <input
          id="project-gh"
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* 标签 */}
      <div>
        <label
          htmlFor="project-tags"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          标签
        </label>
        <input
          id="project-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="多个标签用逗号分隔，如 React, TypeScript"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          多个标签用逗号分隔
        </p>
      </div>

      {/* 精选 */}
      <div className="flex items-center gap-2">
        <input
          id="project-featured"
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
        />
        <label
          htmlFor="project-featured"
          className="text-sm font-ui text-on-surface cursor-pointer select-none"
        >
          设为精选项目
        </label>
      </div>

      {/* 封面图 */}
      <div>
        <label className="block text-sm font-ui font-medium text-on-surface mb-1.5">
          封面图
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setCoverFile(file);
          }}
          className="block w-full text-sm text-on-surface-variant
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-ui file:font-medium
            file:bg-surface-container file:text-on-surface
            hover:file:bg-surface-container-high
            file:cursor-pointer file:transition-colors"
        />
        {project?.coverImage && !coverFile && (
          <p className="text-xs text-on-surface-variant mt-1">
            已有关联封面图，选择新文件将替换
          </p>
        )}
      </div>

      {/* 提交 */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white rounded px-6 py-2.5 font-ui font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "提交中..." : isEdit ? "保存修改" : "创建项目"}
        </button>
      </div>
    </form>
  );
}
