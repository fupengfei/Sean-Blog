import type { Metadata } from 'next'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'
import PageViewTracker from '@/components/analytics/PageViewTracker'

export const metadata: Metadata = {
  title: "Sean's AI World",
  description: '个人技术博客，探索 AI 与软件开发',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-ui">
        <PageViewTracker />
        {children}
      </body>
    </html>
  )
}
