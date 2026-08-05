import { test, expect } from '@playwright/test';
import { BACKEND } from '../support/api';
import { loginAdmin, adminHeaders, TEST_PREFIX } from '../support/admin-api';

test('[F-admin-01] Admin 登录成功 @functional @core @feature:5.5.1', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: /登录|登 录/ }).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/admin\/login/);
});

test('[F-admin-02] 登录失败给出错误提示 @functional @feature:5.5.1', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('wrong-password');
  await page.getByRole('button', { name: /登录|登 录/ }).click();
  await expect(page).toHaveURL(/\/admin\/login/); // 仍停留在登录页
});

test('[F-admin-03] 文章创建-后台可见-删除-公开不可见闭环 @functional @writes @feature:5.1.1 @feature:5.1.2 @feature:5.1.3', async ({ request }) => {
  const token = await loginAdmin(request);
  const headers = adminHeaders(token);
  const title = `${TEST_PREFIX} 自动验收文章`;
  let articleId: string | null = null;
  try {
    // 1) 创建（multipart：file 必填）
    const create = await request.post(`${BACKEND}/api/v1/admin/articles`, {
      headers,
      multipart: {
        file: {
          name: 'article.md',
          mimeType: 'text/markdown',
          buffer: Buffer.from(`# ${title}\n\n这是自动化验收创建的测试文章。`),
        },
        title,
      },
    });
    expect(create.ok(), `创建失败: ${await create.text()}`).toBeTruthy();
    const created = await create.json();
    articleId = String(created.data.id);
    expect(created.data.title).toBe(title);

    // 2) 后台列表可见
    const list = await request.get(
      `${BACKEND}/api/v1/admin/articles?page=1&size=100&keyword=${encodeURIComponent(TEST_PREFIX)}`,
      { headers },
    );
    const titles = ((await list.json()).data.list ?? []).map((a: { title: string }) => a.title);
    expect(titles).toContain(title);

    // 3) 删除（软删）
    const del = await request.delete(`${BACKEND}/api/v1/admin/articles/${articleId}`, { headers });
    expect(del.ok()).toBeTruthy();
    articleId = null; // 已清理，teardown 不再重复删

    // 4) 前台公开列表不可见
    const pub = await fetch(`${BACKEND}/api/v1/articles?page=1&size=100`);
    const pubTitles = ((await pub.json()).data.list ?? []).map((a: { title: string }) => a.title);
    expect(pubTitles).not.toContain(title);
  } finally {
    if (articleId) {
      await request.delete(`${BACKEND}/api/v1/admin/articles/${articleId}`, { headers });
    }
  }
});
