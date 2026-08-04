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
  test.skip(featured.length === 0, '后端无精选文章');
  await page.goto('/');
  await expect(page.getByText(featured[0].title)).toBeVisible();
});

test('[F-home-03] ContactSection 合作意向表单可见（姓名+邮箱+留言） @functional', async ({ page }) => {
  await page.goto('/');
  // ContactSection 表单：姓名、邮箱输入项 + 合作详情留言框
  await expect(page.getByPlaceholder('Name')).toBeVisible();
  await expect(page.getByPlaceholder('Email Address')).toBeVisible();
  await expect(page.getByPlaceholder(/项目需求或合作意向/)).toBeVisible();
});
