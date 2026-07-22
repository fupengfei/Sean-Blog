'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBundleTree, getBundleFile } from '@/lib/api';
import type { FileTreeNode, FileTreeResponse } from '@/types';
import FileTreeView from '@/components/skill/FileTreeView';
import FileContentView from '@/components/skill/FileContentView';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';

/**
 * Skill 详情页（/blog/skills/[id]）
 *
 * 数据获取：客户端 fetch，挂载时拉取文件树（getBundleTree），选中文件时按需拉取内容（getBundleFile）
 *
 * 页面布局：左文件树（280px 侧栏）+ 右文件内容（FileContentView，支持代码高亮）
 *
 * 状态覆盖：
 * - loadingTree：左侧 spinner
 * - tree error：左侧 "无法加载目录"
 * - loadingFile：右侧 FileContentView 内部 loading
 * - normal：左右分栏可交互
 *
 * 交互：点击左侧树节点触发文件内容懒加载，使用 useCallback 避免不必要的重新渲染
 */
export default function SkillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [bundle, setBundle] = useState<FileTreeResponse | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Fetch bundle tree
  useEffect(() => {
    if (!id) return;

    setLoadingTree(true);
    getBundleTree(id)
      .then(setBundle)
      .catch(() => setBundle(null))
      .finally(() => setLoadingTree(false));
  }, [id]);

  // Handle file selection
  const handleSelectFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      setLoadingFile(true);
      setFileContent(null);

      getBundleFile(id, path)
        .then(setFileContent)
        .catch(() => setFileContent(null))
        .finally(() => setLoadingFile(false));
    },
    [id],
  );

  return (
    <>
      <NavBar />
      <main className="min-h-screen flex flex-col">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <Link
              href="/blog/skills"
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              返回 Skills
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
              {bundle?.bundleName || '加载中...'}
            </h1>
          </div>

          {/* Content area: left tree + right file viewer */}
          <div className="flex-1 flex gap-0 border border-outline-variant rounded-lg overflow-hidden min-h-0">
            {/* Left: File tree */}
            <aside className="w-[280px] flex-shrink-0 border-r border-outline-variant bg-surface-container-low overflow-y-auto">
              {loadingTree ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-on-surface-variant">加载目录...</p>
                </div>
              ) : !bundle ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <p className="text-sm text-on-surface-variant">无法加载目录</p>
                </div>
              ) : (
                <FileTreeView
                  tree={bundle.tree}
                  onSelectFile={handleSelectFile}
                />
              )}
            </aside>

            {/* Right: File content */}
            <section className="flex-1 overflow-hidden flex flex-col min-w-0">
              <FileContentView
                filePath={selectedPath}
                content={fileContent}
                loading={loadingFile}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
