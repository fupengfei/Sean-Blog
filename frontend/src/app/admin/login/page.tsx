"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/api";
import { login, isAuthenticated } from "@/lib/auth";

/**
 * Admin 登录页（/admin/login）
 *
 * 数据获取：无初始数据请求，表单提交时调用 adminLogin API
 *
 * 认证流程：
 * - 客户端挂载后检查是否已登录（isAuthenticated），已登录则跳转 /admin/dashboard
 * - 使用 mounted 状态避免 SSR/CSR 水合不一致（hydration mismatch）
 * - 提交表单 → adminLogin → 存储 JWT token → 跳转 dashboard
 *
 * 状态覆盖：
 * - 未挂载（SSR 阶段）：return null
 * - 表单校验失败：红色错误提示
 * - API 错误：红色错误提示
 * - loading：按钮显示 "登录中..." 并禁用
 * - 成功：存储 token 后跳转
 */
export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated()) {
      router.replace("/admin/dashboard");
    }
  }, [mounted, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin({ username, password });
      login(res.token);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "登录失败，请检查用户名和密码");
      } else {
        setError("登录失败，请检查用户名和密码");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-outline-variant w-full max-w-md">
        <h1 className="text-2xl font-display font-semibold text-primary text-center mb-6">
          Sean&apos;s Admin
        </h1>
        <p className="text-sm text-on-surface-variant text-center mb-8">
          请使用管理员账号登录
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-ui text-on-surface mb-1.5"
            >
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-ui text-on-surface mb-1.5"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded px-4 py-2.5 font-ui font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}
