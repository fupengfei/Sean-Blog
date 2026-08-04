import type { APIRequestContext } from '@playwright/test';
import { BACKEND } from './api';

export const TEST_PREFIX = '[scorecard-test]';

export async function loginAdmin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/api/v1/admin/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  if (!res.ok()) throw new Error(`admin 登录失败 HTTP ${res.status()}`);
  const body = await res.json();
  return body.data.token as string;
}

export function adminHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
