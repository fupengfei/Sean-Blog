"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getCategories, getTags, adminCreateArticle, adminUpdateArticle } from "@/lib/api";
import type { Category, Tag, Article } from "@/types";

interface Props {
  onSuccess: () => void;
  /** 编辑模式：传入现有文章数据 */
  article?: Article;
}

export default function ArticleEditor({ onSuccess, article }: Props) {
  const isEdit = !!article;

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    article?.categoryId ?? null,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    article?.tags?.map((t) => t.id) ?? [],
  );
  const [author, setAuthor] = useState(article?.author ?? '');
  const [isFeatured, setIsFeatured] = useState(article?.isFeatured ?? false);
  const [title, setTitle] = useState(article?.title ?? '');
  const [description, setDescription] = useState(article?.excerpt ?? '');
  const [publishDate, setPublishDate] = useState(
    article?.publishDate ?? new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载分类和标签
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cats, tgs] = await Promise.all([getCategories(), getTags()]);
        if (!cancelled) {
          setCategories(cats);
          setTags(tgs);
        }
      } catch {
        // 忽略加载错误，使用空数组
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const f = droppedFiles[0];
      if (f.name.endsWith(".md") || f.type === "text/markdown") {
        setFile(f);
      } else {
        setError("请上传 .md 格式的文件");
      }
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        if (selected.name.endsWith(".md")) {
          setFile(selected);
          setError("");
        } else {
          setError("请上传 .md 格式的文件");
        }
      }
    },
    [],
  );

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isEdit && !file) {
      setError("请上传 .md 文件");
      return;
    }

    if (!selectedCategoryId) {
      setError("请选择分类");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("categoryId", String(selectedCategoryId));
      formData.append("tags", selectedTagIds.join(","));
      formData.append("isFeatured", String(isFeatured));
      formData.append("author", author.trim());
      formData.append("publishDate", publishDate);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      if (isEdit) {
        await adminUpdateArticle(article!.id, formData);
      } else {
        await adminCreateArticle(formData);
      }
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || (isEdit ? "更新失败" : "创建失败"));
      } else {
        setError(isEdit ? "更新失败" : "创建失败");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 文章标题 */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-ui font-medium text-on-surface mb-2"
        >
          文章标题
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="留空则自动从 MD 中提取"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
        />
      </div>

      {/* 文章描述 */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-ui font-medium text-on-surface mb-2"
        >
          文章描述
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="留空则自动从文章内容中生成（用于卡片展示）"
          rows={3}
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-on-surface-variant/50 resize-none"
        />
      </div>

      {/* 发布日期 */}
      <div>
        <label
          htmlFor="publishDate"
          className="block text-sm font-ui font-medium text-on-surface mb-2"
        >
          发布日期
        </label>
        <input
          id="publishDate"
          type="date"
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
          className="border border-outline-variant rounded px-4 py-2 w-full max-w-xs text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <p className="text-xs text-on-surface-variant/60 mt-1">
          页面展示的文章发布日期，默认当天
        </p>
      </div>

      {/* 文件拖拽上传区 */}
      <div>
        <label className="block text-sm font-ui font-medium text-on-surface mb-2">
          文章文件 (.md) {isEdit ? "（可选，上传新文件将替换旧内容）" : ""}
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${dragActive ? "border-primary bg-primary-fixed/30" : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"}
          `}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div>
              <span className="text-3xl">📄</span>
              <p className="mt-2 text-sm font-ui text-on-surface font-medium">
                {file.name}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2 text-xs text-red-600 hover:underline"
              >
                移除
              </button>
            </div>
          ) : (
            <div>
              <span className="text-3xl">📁</span>
              <p className="mt-2 text-sm font-ui text-on-surface-variant">
                {isEdit
                  ? "拖拽新 .md 文件到此处替换，或点击选择"
                  : "拖拽 .md 文件到此处，或点击选择"}
              </p>
              <p className="text-xs text-on-surface-variant/70 mt-1">
                仅支持 Markdown (.md) 文件
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* 分类下拉 */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-ui font-medium text-on-surface mb-2"
        >
          分类
        </label>
        <select
          id="category"
          value={selectedCategoryId ?? ""}
          onChange={(e) =>
            setSelectedCategoryId(
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        >
          <option value="">请选择分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 标签多选 */}
      <div>
        <label className="block text-sm font-ui font-medium text-on-surface mb-2">
          标签
        </label>
        {tags.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            暂无可选标签，请先创建标签
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className={`px-3 py-1.5 text-sm font-ui rounded-full border transition-colors
                    ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"
                    }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 作者 */}
      <div>
        <label
          htmlFor="author"
          className="block text-sm font-ui font-medium text-on-surface mb-2"
        >
          作者
        </label>
        <input
          id="author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="输入作者名称（可选）"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
        />
      </div>

      {/* 精选切换 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-ui font-medium text-on-surface">
          设为精选
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isFeatured}
          onClick={() => setIsFeatured(!isFeatured)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20
            ${isFeatured ? "bg-secondary" : "bg-outline-variant"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isFeatured ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded px-6 py-2.5 font-ui font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "提交中..." : isEdit ? "更新文章" : "创建文章"}
        </button>
      </div>
    </form>
  );
}
