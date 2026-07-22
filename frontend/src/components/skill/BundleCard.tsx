import Link from 'next/link';
import type { FileBundle } from '@/types';

/** Skill Bundle 卡片 Props */
interface BundleCardProps {
  bundle: FileBundle;
}

/**
 * Skill Bundle 卡片组件
 *
 * 用于 Skill 列表页的网格布局，每张卡片链接到对应的文件树浏览页。
 *
 * 卡片内容：
 * - SKILL 类型徽章（secondary 色调）
 * - 文件夹图标 + Bundle 名称
 * - 描述文字（最多 2 行截断）
 * - 文件数量 + Bundle 类型标签
 *
 * Hover 动效：轻微上浮 + 阴影，与 ProjectCard 保持一致。
 */
export default function BundleCard({ bundle }: BundleCardProps) {
  return (
    <Link href={`/projects/skills/${bundle.id}`}>
      <article className="rounded-lg border border-outline-variant bg-white p-6 transition-transform hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        {/* SKILL badge */}
        <div className="mb-3">
          <span className="inline-block px-2.5 py-0.5 rounded bg-secondary/10 text-secondary text-xs font-bold tracking-wider uppercase">
            SKILL
          </span>
        </div>

        {/* Folder icon + name */}
        <div className="flex items-center gap-3 mb-3">
          <svg
            className="w-8 h-8 text-primary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
          <h3 className="font-display text-lg font-semibold text-primary line-clamp-1">
            {bundle.name}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-on-surface-variant leading-relaxed mb-3 line-clamp-2">
          {bundle.description || '暂无描述'}
        </p>

        {/* Author */}
        <div className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 mb-3">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Sean
        </div>

        {/* File count badge */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-medium text-on-surface-variant">
            <svg
              className="w-3.5 h-3.5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            {bundle.fileCount ?? 0} 个文件
          </span>
          {bundle.type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium">
              {bundle.type}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
