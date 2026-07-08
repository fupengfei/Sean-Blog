import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Sean's AI World",
  description: '个人技术博客，探索 AI 与软件开发',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-ui">{children}</body>
    </html>
  )
}
