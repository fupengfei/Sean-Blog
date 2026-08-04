import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['{functional,design,a11y}/**/*.spec.ts'],
  timeout: 30_000,
  retries: 0, // 失败必须可见，flake 靠修复不靠掩盖
  workers: 1, // admin CRUD 与公共页读取不并发，避免数据竞争
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000', // docker compose frontend 容器
    viewport: { width: 1280, height: 900 },
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
});
