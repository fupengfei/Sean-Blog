import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, PageResult } from '../support/api';

test('[F-detail-01] 文章详情 MD 渲染成功 @functional @core', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  await page.goto(`/blog/${a.id}`);
  await expect(page.getByRole('heading', { name: a.title })).toBeVisible();
  // MD 正文容器：实际 class 为 prose-custom（非标准 prose），<article> 标签为语义容器
  await expect(page.locator('article')).toBeVisible();
});

test('[F-detail-02] 详情页 NavBar 与 Footer 齐全 @functional', async ({ page }) => {
  // 历史踩坑：详情页曾漏掉 NavBar+Footer，此用例防回归
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  await page.goto(`/blog/${a.id}`);
  await expect(page.locator('header.sticky')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
});
