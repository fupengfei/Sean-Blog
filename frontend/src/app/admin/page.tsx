"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/**
 * Admin 入口页（/admin）
 *
 * 行为：根据认证状态自动重定向
 * - 已登录 → /admin/dashboard（仪表盘）
 * - 未登录 → /admin/login（登录页）
 *
 * 渲染：不渲染任何 UI，return null，仅执行重定向逻辑
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  return null;
}
