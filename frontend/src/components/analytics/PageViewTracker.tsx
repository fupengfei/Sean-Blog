'use client';

import usePageView from '@/hooks/usePageView';

/**
 * 全局 PV 追踪组件
 *
 * 挂载到 RootLayout 中，自动追踪所有前台页面的浏览行为。
 * 自身不渲染任何 DOM 节点（return null），仅通过 `usePageView()` hook
 * 监听路由变化并向后端发送 PV 统计事件。
 *
 * 设计原因：作为独立客户端组件挂载，避免将 'use client' 指令扩散到整个 RootLayout。
 */
export default function PageViewTracker() {
  usePageView();
  return null;
}
