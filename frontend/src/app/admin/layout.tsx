"use client";

import { usePathname } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";

/**
 * Admin 根布局（/admin/*）
 *
 * 职责：
 * - 根据路径决定是否包裹 AdminLayout（侧栏 + 顶栏布局）
 * - /admin/login 页面不包裹 AdminLayout，独立渲染登录表单
 * - 其他所有 admin 子页面均包裹 AdminLayout，提供统一的导航框架
 *
 * 注意：这是客户端组件，因为依赖 usePathname() 判断当前路由
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // /admin/login 页面不包裹 AdminLayout，避免出现侧栏
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
