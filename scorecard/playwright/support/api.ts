// 后端只读 API 助手：数据驱动断言（先问 API 要事实，再断言页面呈现一致）。
export const BACKEND = 'http://localhost:8880';

export interface PageResult<T> { list: T[]; total: number; page: number; size: number; }
export interface Article { id: string; slug?: string; title: string; [k: string]: unknown; }
export interface Project { id: string; title: string; url?: string; githubUrl?: string; [k: string]: unknown; }
export interface Category { id: string; name: string; slug: string; [k: string]: unknown; }
export interface FileBundle { id: string; name: string; [k: string]: unknown; }

/** GET 后端公开 API，返回 Result<T> 里的 data。 */
export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`);
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
  const body = await res.json();
  return body.data as T;
}
