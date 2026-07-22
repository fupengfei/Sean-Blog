/**
 * 认证工具模块
 *
 * Token 存储在浏览器 localStorage 中，key 为 `token`。
 * 所有 Admin API 请求通过 Authorization: Bearer <token> 头携带。
 */

/**
 * 判断当前用户是否已登录（是否有有效 token）
 *
 * 使用 `typeof window === 'undefined'` 做 SSR 安全检查：
 * 服务端渲染时无 window 对象，直接返回 false，避免报错。
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

/**
 * 保存登录 token 到 localStorage
 * @param token JWT token 字符串
 */
export function login(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * 退出登录：清除 token 并跳转到登录页
 */
export function logout(): void {
  localStorage.removeItem('token');
  window.location.href = '/admin/login';
}

/**
 * 获取当前存储的 token
 * @returns token 字符串，SSR 环境或未登录时返回 null
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
