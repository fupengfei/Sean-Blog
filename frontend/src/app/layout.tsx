import type { Metadata } from 'next'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import ChatProviderWrapper from '@/components/chat/ChatProviderWrapper'

/**
 * 全局 SEO 元数据：站点标题、描述、图标
 */
export const metadata: Metadata = {
  title: "Sean's AI World",
  description: '个人技术博客，探索 AI 与软件开发',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
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
      <body className="font-ui">
        <ChatProviderWrapper>
          <PageViewTracker />
          {children}
        </ChatProviderWrapper>
      </body>
    </html>
  )
}
