import type { Metadata } from 'next'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import ChatProviderWrapper from '@/components/chat/ChatProviderWrapper'

/**
 * 站点 URL（构建时注入，用于 metadataBase 解析相对路径）
 * - 本地：http://localhost:3000
 * - 生产：通过 docker-compose build-arg / .env.production 注入
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * 全局 SEO 元数据：站点标题、描述、图标、Open Graph / Twitter Card
 *
 * 文章详情页通过 /blog/[id]/layout.tsx 的 generateMetadata 进一步覆写，
 * 为每篇文章生成独立的 og:title / og:description / og:image。
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sean's AI World",
    template: "%s - Sean's AI World",
  },
  description: '个人技术博客，探索 AI 与软件开发',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  // 站点级 Open Graph — 文章页会覆写这些值
  openGraph: {
    title: "Sean's AI World",
    description: '个人技术博客，探索 AI 与软件开发',
    type: 'website',
    siteName: "Sean's AI World",
    images: [
      {
        url: '/og-image.jpg?v=3',
        width: 300,
        height: 300,
        alt: "Sean's AI World",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sean's AI World",
    description: '个人技术博客，探索 AI 与软件开发',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'wx:webpage': 'true',
    'wx:thumbnail': `${SITE_URL}/og-image-wechat.jpg?v=3`,
  },
}

/**
 * 应用根布局组件
 *
 * 职责：
 * - 设置 HTML lang 为 zh-CN
 * - 引入全局 CSS 和 highlight.js 代码高亮主题（atom-one-dark）
 * - 挂载 PageViewTracker，在所有页面中自动追踪页面浏览量
 * - 所有子页面通过 {children} 渲染
 *
 * 注意：这是服务端组件，metadata 导出用于 Next.js SEO
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 微信朋友圈标记（property 属性兼容微信爬虫） */}
        <meta property="wx:webpage" content="true" />
      </head>
      <body className="font-ui">
        {/* 微信朋友圈爬虫需要页面 body 内有实际 <img> 标签才会抓取缩略图；
            300×300 尺寸确保被爬虫识别为有效图片（1×1 可能被当作埋点像素忽略），
            CSS 隐藏避免影响页面渲染 */}
        <img
          src={`${SITE_URL}/og-image-wechat.jpg?v=3`}
          alt=""
          width="0"
          height="0"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <ChatProviderWrapper>
          <PageViewTracker />
          {children}
        </ChatProviderWrapper>
      </body>
    </html>
  )
}
