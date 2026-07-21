import Link from 'next/link';
import type { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      href={`/blog/${article.id}`}
      className="group rounded-lg border border-outline-variant bg-white overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
    >
      {/* Optional cover image */}
      {article.coverImage && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-contain transition-transform group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-6">
        {/* Metadata row: category + date + author */}
        <div className="flex items-center gap-3 mb-3">
          {article.category && (
            <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-secondary text-xs font-semibold">
              {article.category.name}
            </span>
          )}
          <span className="text-xs text-on-surface-variant/60">
            {formatDate(article.publishDate || article.createdAt)}
          </span>
          {article.author && (
            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {article.author}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-display text-xl font-semibold text-primary mb-2 group-hover:text-secondary transition-colors line-clamp-2">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-on-surface-variant leading-relaxed mb-3 line-clamp-3">
          {article.excerpt || '暂无摘要'}
        </p>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden mb-3">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded font-display text-[11px] tracking-[0.03em] font-medium text-on-surface-variant bg-surface-container-low border border-outline-variant/60 whitespace-nowrap"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Read more */}
        <span className="text-sm font-medium text-secondary group-hover:underline">
          阅读全文 →
        </span>
      </div>
    </Link>
  );
}
