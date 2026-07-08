"use client";

import { useState, useRef, DragEvent } from "react";
import { adminCreateBundle } from "@/lib/api";

interface Props {
  onSuccess: () => void;
}

export default function BundleUploader({ onSuccess }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("SKILL");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(f: File | null) {
    if (f && !f.name.toLowerCase().endsWith(".zip")) {
      setError("只支持 .zip 格式文件");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("名称不能为空");
      return;
    }

    if (!file) {
      setError("请选择 .zip 文件");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("type", type.trim() || "SKILL");
      formData.append("file", file);

      await adminCreateBundle(formData);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "上传失败";
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

      {/* 拖拽上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : file
            ? "border-secondary bg-secondary-container/20"
            : "border-outline-variant hover:border-primary/40 hover:bg-surface-container"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            handleFileSelect(selected);
          }}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="text-sm font-ui font-medium text-on-surface mb-1">
              {file.name}
            </p>
            <p className="text-xs text-on-surface-variant">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              点击重新选择
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-ui text-on-surface mb-1">
              拖拽 .zip 文件到此处
            </p>
            <p className="text-xs text-on-surface-variant">或点击选择文件</p>
          </div>
        )}
      </div>

      {/* 名称 */}
      <div>
        <label
          htmlFor="bundle-name"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          名称 <span className="text-red-500">*</span>
        </label>
        <input
          id="bundle-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bundle 名称"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* 描述 */}
      <div>
        <label
          htmlFor="bundle-desc"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          描述
        </label>
        <textarea
          id="bundle-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Bundle 描述"
          rows={3}
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
        />
      </div>

      {/* 类型 */}
      <div>
        <label
          htmlFor="bundle-type"
          className="block text-sm font-ui font-medium text-on-surface mb-1.5"
        >
          类型
        </label>
        <input
          id="bundle-type"
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="SKILL"
          className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          默认类型为 SKILL
        </p>
      </div>

      {/* 提交 */}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white rounded px-6 py-2.5 font-ui font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "上传中..." : "上传 Bundle"}
        </button>
      </div>
    </form>
  );
}
