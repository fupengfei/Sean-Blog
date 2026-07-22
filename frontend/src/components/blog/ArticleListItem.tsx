import Link from 'next/link';
import type { Article } from '@/types';

/** 列表项文章卡片 Props */
interface ArticleListItemProps {
  article: Article;
}

/**
 * 格式化日期为中文长格式（如「2026年7月22日」）
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 文章列表项组件
 *
 * 用于博客列表页的单行布局（桌面端）：
 * - 左侧：发布日期（固定宽度 128px）
 * - 中间：分类标签 + 作者 + 标题 + 摘要 + 标签列表
 * - 右侧：箭头图标（hover 时变色）
 *
 * 移动端自动切换为上下堆叠布局。
 */
export default function ArticleListItem({ article }: ArticleListItemProps) {
  return (
    <Link
      href={`/blog/${article.id}`}
      className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 p-6 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low transition-colors"
    >
      {/* Date — left column on desktop */}
      <div className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant sm:w-32 shrink-0">
        {formatDate(article.publishDate || article.createdAt)}
      </div>

      {/* Content — center */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          {article.category && (
            <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-secondary text-xs font-semibold">
              {article.category.name}
            </span>
          )}
          {article.author && (
            <span className="text-xs text-on-surface-variant/60">{article.author}</span>
          )}
        </div>
        <h3 className="font-display text-lg font-semibold text-primary group-hover:text-secondary transition-colors line-clamp-1 mb-1">
          {article.title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 mb-2">
          {article.excerpt || '暂无摘要'}
        </p>
        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-hidden max-h-7">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded font-display text-[11px] tracking-[0.03em] font-medium text-on-surface-variant border border-outline-variant/60 whitespace-nowrap"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Arrow — right */}
      <svg
        className="w-5 h-5 text-outline group-hover:text-secondary transition-colors shrink-0 hidden sm:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
        />
      </svg>
    </Link>
  );
}
