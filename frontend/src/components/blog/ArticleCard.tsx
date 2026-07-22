'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Article } from '@/types';

/**
 * 文章卡片 Props
 */
interface ArticleCardProps {
  article: Article;
  /** 卡片变体：featured（首篇突出）| default（普通） */
  variant?: 'featured' | 'default';
  /** 卡片在列表中的索引，用于交错动画延迟和左侧 accent 颜色 */
  index?: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Pick a subtle accent rotation for visual rhythm when there are no images */
function accentStyle(index: number): string {
  const accents = [
    'border-l-primary/60',
    'border-l-secondary/50',
    'border-l-primary/35',
    'border-l-secondary/30',
    'border-l-primary/50',
    'border-l-secondary/40',
  ];
  return accents[index % accents.length];
}

/**
 * 文章卡片组件
 *
 * 用于博客专栏页的瀑布流网格布局。
 *
 * 核心设计：
 * - **渐进入场动画**：使用 IntersectionObserver 检测可见性，每个卡片按 index 依次 delay 80ms 淡入
 * - **左侧彩色 accent**：非 featured 卡片左侧有 2px 彩色边线（`accentStyle()` 轮换 6 种颜色），增强视觉节奏
 * - **Featured 变体**：更大的内边距、更大的标题字号、左侧 3px Navy 色边线
 * - **高度变化来源**：摘要行数不固定（line-clamp-3/4），不同卡片的标签数量也不同
 */
export default function ArticleCard({ article, variant = 'default', index = 0 }: ArticleCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const delay = index * 80;
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const isFeatured = variant === 'featured';
  const accent = accentStyle(index);

  return (
    <Link
      ref={ref}
      href={`/blog/${article.id}`}
      className={`
        group block rounded-lg border border-outline-variant overflow-hidden
        transition-all duration-500 ease-out
        hover:-translate-y-1 hover:border-primary/20
        hover:shadow-[0_8px_30px_rgba(0,32,69,0.08)]
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        ${isFeatured
          ? 'bg-surface-container-low border-l-[3px] border-l-primary'
          : `bg-white border-l-[2px] ${accent}`
        }
      `}
    >
      {/* Card body */}
      <div
        className={`
          flex flex-col h-full
          ${isFeatured ? 'p-6 md:p-10' : 'p-5 md:p-6'}
        `}
      >
        {/* Metadata row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {article.category && (
            <span className="inline-block px-2.5 py-0.5 rounded font-display text-[11px] tracking-[0.04em] font-semibold uppercase bg-secondary-container text-secondary">
              {article.category.name}
            </span>
          )}
          <span className="text-xs text-on-surface-variant/55 font-medium tracking-wide">
            {formatDate(article.publishDate || article.createdAt)}
          </span>
          {article.author && (
            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant/45">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {article.author}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={`
            font-display font-bold text-primary group-hover:text-secondary transition-colors duration-300
            ${isFeatured
              ? 'text-xl md:text-2xl lg:text-[28px] lg:leading-[1.3]'
              : 'text-lg md:text-xl'
            }
            mb-2.5 line-clamp-2
          `}
        >
          {article.title}
        </h3>

        {/* Excerpt — natural height variation driver */}
        <p
          className={`
            text-on-surface-variant leading-relaxed mb-4
            ${isFeatured ? 'text-sm md:text-base line-clamp-3 md:line-clamp-4' : 'text-sm line-clamp-3'}
          `}
        >
          {article.excerpt || '暂无摘要'}
        </p>

        {/* Tags + read-more row */}
        <div className="mt-auto flex items-end justify-between gap-4">
          {/* Tags — each card shows different numbers creating natural height variation */}
          {article.tags && article.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden max-h-7">
              {article.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded font-display text-[11px] tracking-[0.03em] font-medium text-on-surface-variant bg-surface-container-low border border-outline-variant/60 whitespace-nowrap"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <div /> /* spacer so read-more still aligns right */
          )}

          {/* Read more */}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary/80 group-hover:text-secondary group-hover:gap-2 transition-all duration-300 shrink-0">
            阅读全文
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
