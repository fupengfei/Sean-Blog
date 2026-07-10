'use client';

import usePageView from '@/hooks/usePageView';

/**
 * 客户端组件：挂载到 RootLayout 中追踪所有页面访问
 * 自身不渲染任何 DOM
 */
export default function PageViewTracker() {
  usePageView();
  return null;
}
