'use client';

import Link from 'next/link';
import { useChat } from './ChatProvider';

/**
 * ArticleContextChip — 聊天面板头部的文章上下文提示
 *
 * 仅当用户正在文章详情页（articleContext 存在）时渲染。
 * 样式遵循 DESIGN.md：1px 边框（outline-variant）、Green 辅色文字（secondary）。
 * 点击 chip 跳转到对应文章。
 */
export default function ArticleContextChip() {
  const { articleContext } = useChat();
  if (!articleContext) return null;

  return (
    <div className="px-4 py-2 border-b border-outline-variant/60 bg-surface-container-low shrink-0">
      <Link
        href={`/blog/${articleContext.id}`}
        title={articleContext.title}
        className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full border border-outline-variant bg-white text-secondary text-xs font-medium hover:bg-secondary-container/40 transition-colors"
      >
        <span className="flex-shrink-0">📖</span>
        <span className="truncate">《{articleContext.title}》</span>
      </Link>
    </div>
  );
}
