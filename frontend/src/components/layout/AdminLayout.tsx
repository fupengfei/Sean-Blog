"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "仪表盘", href: "/admin/dashboard", icon: "📊" },
  { label: "访问统计", href: "/admin/analytics", icon: "📈" },
  { label: "文章管理", href: "/admin/articles", icon: "📝" },
  { label: "分类管理", href: "/admin/categories", icon: "📁" },
  { label: "标签管理", href: "/admin/tags", icon: "🏷️" },
  { label: "项目管理", href: "/admin/projects", icon: "🚀" },
  { label: "文件目录", href: "/admin/bundles", icon: "📦" },
  { label: "联系记录", href: "/admin/contacts", icon: "📬" },
  { label: "修改密码", href: "/admin/settings", icon: "🔒" },
];

/**
 * Admin 管理后台布局
 *
 * 双栏结构：
 * - **左侧**：固定宽度的深色侧边栏（Navy #002045 背景），包含 Logo、导航菜单、退出登录按钮
 * - **右侧**：可滚动的内容区，渲染 `children`
 *
 * 认证守卫：
 * - 首次挂载时设置 `mounted=true`，确保 SSR/CSR 一致性
 * - 未登录用户自动 `router.replace("/admin/login")` 跳转到登录页
 * - 加载中状态显示「加载中...」防止闪烁
 *
 * 活跃链接检测：使用 `pathname.startsWith(item.href)` 匹配当前路由
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.replace("/admin/login");
    }
  }, [mounted, router]);

  if (!mounted || !isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* 左侧固定侧边栏 */}
      <aside className="w-64 bg-primary min-h-screen flex flex-col flex-shrink-0">
        {/* Logo 区域 */}
        <div className="px-6 py-6 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 text-white text-xl font-display font-semibold tracking-wide">
            <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
            Sean&apos;s Admin
          </Link>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-ui transition-colors
                  ${
                    isActive
                      ? "bg-white/10 text-white font-medium"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部退出按钮 */}
        <div className="px-4 py-4 border-t border-white/10">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-ui text-white/70 hover:bg-white/5 hover:text-white w-full transition-colors"
          >
            <span className="text-base">🚪</span>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 p-8 bg-surface min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
