import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 812 };
const PAGES: Array<[string, string]> = [
  ['/', '首页'],
  ['/blog', '博客列表'],
  ['/projects', '项目'],
  ['/about', '关于我'],
];

PAGES.forEach(([path, label], i) => {
  test(`[D-resp-0${i + 1}] ${label} 375px 视口无横向溢出 @design`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('[D-resp-05] 窄屏导航折叠为菜单按钮 @design', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/');
  const menuBtn = page.getByRole('button', { name: /打开菜单|关闭菜单/ });
  await expect(menuBtn).toBeVisible();
  await menuBtn.click();
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
});

test('[D-shot-01] 首页桌面视觉基线 @design', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true });
});

test('[D-shot-02] 博客列表桌面视觉基线 @design', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveScreenshot('blog-desktop.png', { fullPage: true });
});

test('[D-shot-03] 项目页桌面视觉基线 @design', async ({ page }) => {
  await page.goto('/projects');
  await expect(page).toHaveScreenshot('projects-desktop.png', { fullPage: true });
});

test('[D-shot-04] 首页移动视觉基线 @design', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true });
});

test('[D-shot-05] 博客列表移动视觉基线 @design', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/blog');
  await expect(page).toHaveScreenshot('blog-mobile.png', { fullPage: true });
});
