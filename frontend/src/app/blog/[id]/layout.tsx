// =============================================================================
// 文章详情页 Layout（Server Component）
// =============================================================================
// 职责：在服务端获取文章数据，通过 generateMetadata 为每篇文章生成独立的
// Open Graph（og:title / og:description / og:image）和 Twitter Card meta 标签。
//
// 背景：page.tsx 是 'use client' 客户端组件，无法导出 generateMetadata，
// 而微信等平台分享时依赖 og 标签展示标题/描述/logo，因此通过同级 layout
// 补齐 SEO 元数据。
// =============================================================================

import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// 服务端工具
// ---------------------------------------------------------------------------

/**
 * 读取后端 API Base（服务端环境变量，非 NEXT_PUBLIC_，仅 SSR 可用）
 * - 本地开发：.env.local 中 BACKEND_URL=http://localhost:8880
 * - Docker 部署：docker-compose.yml 注入 BACKEND_URL=http://backend:8880
 */
function getApiBase(): string {
  return `${process.env.BACKEND_URL || 'http://localhost:8880'}/api/v1`;
}

/**
 * 站点 URL（用于构造 og:image / og:url 等绝对路径）
 * - 本地开发：http://localhost:3000
 * - 生产部署：通过 docker-compose 注入 NEXT_PUBLIC_SITE_URL
 */
function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/**
 * 将可能为相对路径的封面图 URL 转为绝对 URL（OG 要求绝对路径）
 */
function resolveImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return `${getSiteUrl()}/og-image.jpg?v=2`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${getSiteUrl()}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

/** 微信 thumbnail 专用：默认用 300x300 小图（微信限制 32KB），有封面图则用封面 */
function resolveWechatThumbnail(imagePath: string | null | undefined): string {
  if (!imagePath) return `${getSiteUrl()}/og-image-wechat.jpg?v=2`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${getSiteUrl()}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

// ---------------------------------------------------------------------------
// 服务端数据获取（带 5s 超时 + 错误兜底）
// ---------------------------------------------------------------------------

interface ArticleMeta {
  title: string;
  excerpt: string;
  coverImage: string | null;
}

async function fetchArticleMeta(id: string): Promise<ArticleMeta | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${getApiBase()}/articles/${id}`, {
      signal: controller.signal,
      // 缓存 60s，降低后端压力（同一篇文章短期内不重复请求）
      next: { revalidate: 60 },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const json = await res.json();
    // 后端统一响应格式：{ code: 200, data: Article, message: "ok" }
    const data = json.data;
    if (!data) return null;

    return {
      title: data.title || '',
      excerpt: data.excerpt || '',
      coverImage: data.coverImage || null,
    };
  } catch {
    // 网络错误 / 超时 → 返回 null，generateMetadata 用兜底值
    return null;
  }
}

// ---------------------------------------------------------------------------
// generateMetadata — 为每篇文章生成动态 OG / Twitter Card
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const article = await fetchArticleMeta(params.id);
  const siteUrl = getSiteUrl();

  if (!article) {
    // 文章不存在 / API 故障 — 兜底 meta
    return {
      title: '文章详情',
      openGraph: {
        title: "文章详情 - Sean's AI World",
        description: '个人技术博客，探索 AI 与软件开发',
        type: 'website',
        images: [`${siteUrl}/og-image.jpg?v=2`],
      },
      twitter: {
        card: 'summary',
        title: "文章详情 - Sean's AI World",
        description: '个人技术博客，探索 AI 与软件开发',
        images: [`${siteUrl}/og-image.jpg?v=2`],
      },
      other: {
        'wx:webpage': 'true',
        'wx:thumbnail': `${siteUrl}/og-image-wechat.jpg?v=2`,
      },
    };
  }

  const ogImage = resolveImageUrl(article.coverImage);
  const wechatThumb = resolveWechatThumbnail(article.coverImage);

  // title 只用文章标题，站点名由根 layout 的 title.template 自动拼接
  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || '',
      type: 'article',
      url: `${siteUrl}/blog/${params.id}`,
      images: [
        {
          url: ogImage,
          width: article.coverImage ? 1200 : 1024,
          height: article.coverImage ? 630 : 1024,
          alt: article.title,
        },
      ],
      siteName: "Sean's AI World",
    },
    twitter: {
      card: article.coverImage ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.excerpt || '',
      images: [ogImage],
    },
    // 微信私有标签：朋友圈分享依赖 wx:thumbnail 展示缩略图（微信限制 32KB，默认用 300x300 小图）
    other: {
      'wx:webpage': 'true',
      'wx:thumbnail': wechatThumb,
    },
  };
}

// ---------------------------------------------------------------------------
// Layout — 直接透传 children，不做额外包装
// ---------------------------------------------------------------------------

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
