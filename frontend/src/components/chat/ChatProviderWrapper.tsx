'use client';

import { usePathname } from 'next/navigation';
import { ChatProvider } from './ChatProvider';
import ChatWidget from './ChatWidget';

/**
 * ChatProviderWrapper — 'use client' 边界组件
 *
 * 职责：
 * - 通过 usePathname() 判断当前是否在 /admin/* 路由下
 * - Admin 路由：直接渲染 children，不挂载 ChatProvider 和 ChatWidget
 * - 公开路由：包裹 ChatProvider + ChatWidget
 *
 * 为什么需要这个 wrapper：
 * - RootLayout 是 server component，不能直接使用 'use client' hooks
 * - ChatProvider 需要 Context + SSE 流，必须是 client component
 * - Admin 页面有自己的布局和认证守卫，不应出现聊天组件
 */
export default function ChatProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Admin 路由不渲染聊天组件
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <ChatWidget />
      {children}
    </ChatProvider>
  );
}
