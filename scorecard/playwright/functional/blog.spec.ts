import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, Category, PageResult } from '../support/api';

test('[F-blog-01] 文章列表加载出数据 @functional @core @feature:2.1', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  await page.goto('/blog');
  if (res.total > 0) {
    await expect(page.getByText(res.list[0].title)).toBeVisible();
  } else {
    await expect(page.getByText('文章即将发布')).toBeVisible(); // 空状态文案
  }
});

test('[F-blog-02] 分类筛选：点击分类后列表刷新不报错 @functional @feature:2.1', async ({ page }) => {
  const categories = await api<Category[]>('/api/v1/categories');
  test.skip(categories.length === 0, '无分类数据');
  await page.goto('/blog');
  // FilterBar：「全部」按钮始终首位，其后为各分类按钮
  await page.getByRole('button', { name: categories[0].name, exact: true }).click();
  // 切换后页面仍正常：出现文章卡片或该分类空状态文案，二者之一
  const hasContent = page.locator('main').getByRole('link').first();
  const empty = page.getByText('该分类下暂无文章');
  await expect(hasContent.or(empty)).toBeVisible({ timeout: 10_000 });
});

test('[F-blog-03] 卡片视图/列表视图切换 @functional @feature:2.1', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  test.skip(res.total === 0, '无文章数据');
  await page.goto('/blog');
  const listToggle = page.locator('button[title], button[aria-label]').filter({ has: page.locator('svg') }).last();
  await listToggle.click();
  await expect(page.locator('main')).toBeVisible();
});

test('[F-blog-04] 分页切换 @functional @feature:2.1', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  // 不足一页不显示分页器（项目约定），此时跳过
  test.skip(res.total <= 10, '文章不足一页，无分页器');
  await page.goto('/blog');
  await page.getByRole('button', { name: '2' }).click();
  // 第 2 页加载后列表区仍正常渲染
  await expect(page.locator('main')).toBeVisible();
});
