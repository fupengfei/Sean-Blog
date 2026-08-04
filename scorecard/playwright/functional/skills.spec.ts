import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { FileBundle } from '../support/api';

test('[F-skills-01] Skill 列表页加载 @functional', async ({ page }) => {
  const bundles = await api<FileBundle[]>('/api/v1/bundles');
  await page.goto('/blog/skills');
  if (bundles.length > 0) {
    await expect(page.getByText(bundles[0].name)).toBeVisible();
  } else {
    await expect(page.locator('main')).toBeVisible(); // 空状态也应正常渲染
  }
});

test('[F-skills-02] Skill 文件树浏览页可打开 @functional', async ({ page }) => {
  const bundles = await api<FileBundle[]>('/api/v1/bundles');
  test.skip(bundles.length === 0, '无 Skill Bundle 数据');
  await page.goto(`/blog/skills/${bundles[0].id}`);
  // 左树右内容布局：页面正常渲染且不报错
  await expect(page.locator('main')).toBeVisible();
});
