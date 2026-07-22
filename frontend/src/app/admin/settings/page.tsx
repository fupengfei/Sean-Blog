"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminChangePassword } from "@/lib/api";
import { logout } from "@/lib/auth";

/**
 * 修改密码页（/admin/settings）
 *
 * 数据获取：无初始数据请求，仅表单提交时调用 adminChangePassword API
 *
 * 表单校验规则：
 * - 旧密码不能为空
 * - 新密码不能为空且长度 >= 6
 * - 确认密码须与新密码一致
 * - 新密码不能与旧密码相同
 *
 * 状态覆盖：
 * - 表单校验失败：红色错误提示
 * - API 错误：红色错误提示
 * - loading：按钮显示 "提交中..." 并禁用
 * - 成功：绿色成功提示 → 3 秒后自动 logout 跳转登录页
 * - 成功状态时隐藏表单，仅显示成功消息
 */
export default function AdminSettingsPage() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 校验
    if (!oldPassword.trim()) {
      setError("请输入旧密码");
      return;
    }
    if (!newPassword.trim()) {
      setError("请输入新密码");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码长度不能少于 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (oldPassword === newPassword) {
      setError("新密码不能与旧密码相同");
      return;
    }

    setLoading(true);
    try {
      await adminChangePassword({ oldPassword, newPassword });
      setSuccess("密码修改成功，即将跳转至登录页...");
      // 3 秒后退出并跳转到登录页
      setTimeout(() => {
        logout();
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "密码修改失败");
      } else {
        setError("密码修改失败");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        修改密码
      </h1>

      <div className="max-w-md bg-white rounded-lg p-6 border border-outline-variant">
        {success ? (
          <div className="text-sm text-secondary bg-green-50 border border-green-200 rounded px-4 py-3 mb-6">
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="oldPassword"
                className="block text-sm font-ui font-medium text-on-surface mb-1.5"
              >
                旧密码
              </label>
              <input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-ui font-medium text-on-surface mb-1.5"
              >
                新密码
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少 6 位）"
                className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-ui font-medium text-on-surface mb-1.5"
              >
                确认新密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="border border-outline-variant rounded px-4 py-2 w-full text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white rounded px-4 py-2.5 font-ui font-medium hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "提交中..." : "修改密码"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
