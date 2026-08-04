import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article } from '../support/api';

test('[F-home-01] 首页打开，NavBar/主内容/Footer 渲染 @functional @core', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header.sticky')).toBeVisible(); // NavBar（sticky 实现）
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
});

test('[F-home-02] 精选文章卡片与后端数据一致 @functional', async ({ page }) => {
  const featured = await api<Article[]>('/api/v1/articles/featured?limit=6');
  test.skip(featured.length === 0, '后端无精選文章');
  await page.goto('/');
  await expect(page.getByText(featured[0].title)).toBeVisible();
});

test('[F-home-03] CTA：简历表单弹窗可打开（公司名+邮箱输入项） @functional', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /简历/ }).click();
  // 弹窗含「公司名称」「邮箱」输入项（feature-list 1.3.2）
  await expect(page.getByPlaceholder(/公司/)).toBeVisible();
  await expect(page.getByPlaceholder(/邮箱/)).toBeVisible();
  await page.keyboard.press('Escape');
});
