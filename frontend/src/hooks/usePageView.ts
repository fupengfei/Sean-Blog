'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { postPageView } from '@/lib/api';

/**
 * 路径 → 统计页面类型映射
 *
 * 将 Next.js 路由路径映射为后端统计的 pageType。
 * 博客详情页提取 slug 作为 pageKey，Skill 详情页提取 id 作为 pageKey。
 * Admin 页面不记录 PV，返回空字符串跳过上报。
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
 *
 * 监听 Next.js 路由变化，每次路由切换时向后端发送 PV（Page View）事件。
 * 通过 `lastPath` ref 去重，避免同一路径重复上报。
 * 上报失败时静默处理，不影响页面正常交互。
 */
export default function usePageView() {
  const pathname = usePathname();
  const lastPath = useRef('');

  useEffect(() => {
    if (pathname === lastPath.current) return; // 去重：同一路径不重复上报
    const info = getPageInfo(pathname);
    if (!info.pageType) return; // 不追踪的页面（如 Admin）
    lastPath.current = pathname;

    postPageView(info).catch(() => {
      // 静默失败，分析统计不应该影响页面体验
    });
  }, [pathname]);
}
