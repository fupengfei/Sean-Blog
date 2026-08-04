import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES: Array<[string, string]> = [
  ['/', '首页'],
  ['/blog', '博客列表'],
  ['/projects', '项目'],
  ['/about', '关于我'],
];

PAGES.forEach(([path, label], i) => {
  test(`[A-page-0${i + 1}] ${label} axe 扫描无 critical/serious 违规 @a11y`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    // moderate/minor 记录在报告里供参考，不扣分
    if (results.violations.length > bad.length) {
      console.log(`${label} moderate/minor 违规（不扣分）：`,
        results.violations.filter((v) => v.impact !== 'critical' && v.impact !== 'serious')
          .map((v) => `${v.id}(${v.impact})`).join(', '));
    }
    expect(bad.map((v) => `${v.id}(${v.impact})`)).toEqual([]);
  });
});
