import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, PageResult } from '../support/api';

test('[D-nav-01] NavBar sticky 且高 80px @design', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header.sticky');
  await expect(header).toBeVisible();
  // h-20 在内层 div 上；header 自身有 border-b（1px），故量内层容器
  const height = await page.locator('header.sticky > div').first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.round(height)).toBe(80); // h-20
});

test('[D-layout-01] 页面容器最大宽 1200px @design', async ({ page }) => {
  await page.goto('/');
  // 1280 视口下，导航内层容器宽度应 <= 1200
  const width = await page.locator('header.sticky > div').first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(1200);
});

test('[D-layout-02] 文章列内容区最大宽 720px @design', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  // 详情页路由是 /blog/[id]，用数字 id；slug 字段存在但路由不消费它
  await page.goto(`/blog/${a.id}`);
  // 正文容器 .prose-custom 设有 max-w-[720px]（tailwind.config font-body 类）；
  // <article> 是 grid 列（col-span-7/8），不受 720 约束，故选 .prose-custom
  const width = await page.locator('.prose-custom').first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(720 + 1); // 1px 容差
});

test('[D-color-01] 主按钮背景为 Navy #002045 @design', async ({ page }) => {
  await page.goto('/admin/login');
  const submit = page.getByRole('button', { name: /登录|登 录/ });
  const bg = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(0, 32, 69)'); // #002045
});

test('[D-card-01] 卡片边框 1px solid（色值允许设计稿两版灰） @design', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  await page.goto('/blog');
  // CLAUDE.md 写 #E2E8F0，DESIGN.md outline-variant 是 #c4c6cf —— 两个来源不一致，
  // 断言允许二者之一，但必须是 1px solid：
  const found = await page.locator('main').evaluate((main) => {
    const allowed = ['rgb(226, 232, 240)', 'rgb(196, 198, 207)'];
    return Array.from(main.querySelectorAll('*')).some((el) => {
      const s = getComputedStyle(el);
      return s.borderWidth === '1px' && s.borderStyle === 'solid' && allowed.includes(s.borderColor);
    });
  });
  expect(found).toBeTruthy();
});

test('[D-font-01] UI 用 Inter，文章正文用 Source Serif 4 @design', async ({ page }) => {
  await page.goto('/');
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toMatch(/Inter/);

  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  // 详情页路由是 /blog/[id]，用数字 id
  await page.goto(`/blog/${a.id}`);
  // .prose-custom 带 font-body 类 → '"Source Serif 4", serif'；
  // <article> 是 grid 列容器，不直接携带字体类
  const proseFont = await page.locator('.prose-custom').first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(proseFont).toMatch(/Source Serif 4/);
});

test('[D-spacing-01] 首页主区块间距为 8 的倍数 @design', async ({ page }) => {
  await page.goto('/');
  const bad = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('main > *'));
    const offenders: string[] = [];
    for (const el of sections) {
      const s = getComputedStyle(el);
      for (const prop of ['paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'] as const) {
        const v = parseFloat(s[prop]);
        if (!Number.isFinite(v)) continue;
        if (Math.round(v) % 8 !== 0) offenders.push(`${el.tagName}.${prop}=${v}`);
      }
    }
    return offenders;
  });
  expect(bad).toEqual([]);
});
