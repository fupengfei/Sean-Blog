"use client";

import { useEffect, useState } from "react";
import { FileBundle } from "@/types";
import { adminGetBundles } from "@/lib/api";
import BundleList from "@/components/admin/BundleList";
import BundleUploader from "@/components/admin/BundleUploader";

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<FileBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function fetchBundles() {
    setLoading(true);
    setError("");
    try {
      const data = await adminGetBundles();
      setBundles(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "加载 Bundle 列表失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBundles();
  }, []);

  function handleUploadSuccess() {
    setShowModal(false);
    fetchBundles();
  }

  function handleRefresh() {
    fetchBundles();
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold text-on-surface">
          文件目录管理
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white rounded px-4 py-2 font-ui font-medium text-sm hover:bg-primary-container transition-colors"
        >
          上传 Bundle
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
        <BundleList bundles={bundles} onRefresh={handleRefresh} />
      )}

      {/* 上传弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          {/* 弹窗内容 */}
          <div className="relative bg-white rounded-lg border border-outline-variant p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-on-surface">
                上传 Bundle
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <BundleUploader onSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
