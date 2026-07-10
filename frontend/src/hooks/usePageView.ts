'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { postPageView } from '@/lib/api';

/**
 * 路径 → 统计页面类型映射
 */
function getPageInfo(pathname: string): { pageType: string; pageKey: string } {
  if (pathname === '/') return { pageType: 'home', pageKey: '' };
  if (pathname === '/blog') return { pageType: 'blog_list', pageKey: '' };
  if (pathname === '/projects') return { pageType: 'projects', pageKey: '' };
  if (pathname === '/about') return { pageType: 'about', pageKey: '' };
  if (pathname === '/blog/skills') return { pageType: 'skills', pageKey: '' };

  if (pathname.startsWith('/blog/skills/')) {
    const id = pathname.split('/')[3] || '';
    return { pageType: 'skills_detail', pageKey: id };
  }
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.split('/')[2] || '';
    return { pageType: 'blog_detail', pageKey: slug };
  }

  // Admin 等其他页面不记录
  return { pageType: '', pageKey: '' };
}

/**
 * 页面浏览追踪 Hook
 * 每次路由切换时向后端发送 PV 事件
 */
export default function usePageView() {
  const pathname = usePathname();
  const lastPath = useRef('');

  useEffect(() => {
    if (pathname === lastPath.current) return; // 去重
    const info = getPageInfo(pathname);
    if (!info.pageType) return; // 不追踪的页面
    lastPath.current = pathname;

    postPageView(info).catch(() => {
      // 静默失败，分析统计不应该影响页面体验
    });
  }, [pathname]);
}
