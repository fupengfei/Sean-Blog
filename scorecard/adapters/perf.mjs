#!/usr/bin/env node
// 性能适配器：Lighthouse performance 类别，3 个关键页面
// 计分：单页 min(100, lh分/90*100)（>=90 满分，线性向下），run.mjs 对 score 取平均
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const FRONTEND = 'http://localhost:3000';
const BACKEND = 'http://localhost:8880';

async function firstArticlePath() {
  try {
    const res = await fetch(`${BACKEND}/api/v1/articles?page=1&size=1`);
    const body = await res.json();
    const a = body.data?.list?.[0];
    if (!a) return null;
    return `/blog/${a.slug ?? a.id}`;
  } catch {
    return null;
  }
}

const checks = [];
const detailPath = await firstArticlePath();
const pages = [
  { id: 'P-home-01', name: '首页性能', url: `${FRONTEND}/` },
  { id: 'P-blog-01', name: '博客列表性能', url: `${FRONTEND}/blog` },
  ...(detailPath ? [{ id: 'P-detail-01', name: '文章详情性能', url: `${FRONTEND}${detailPath}` }] : []),
];

let chrome = null;
try {
  chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
} catch (e) {
  for (const p of pages) {
    checks.push({ id: p.id, name: p.name, passed: false, score: 0, detail: `Chrome 启动失败：${e.message}` });
  }
  console.log(JSON.stringify({ dimension: 'perf', checks }, null, 2));
  process.exit(0); // 输出合法 JSON，perf 记 0 分由报告显著标注
}

for (const p of pages) {
  try {
    const runner = await lighthouse(p.url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      formFactor: 'desktop',
      throttlingMethod: 'provided',
      screenEmulation: { mobile: false, width: 1280, height: 900, deviceScaleFactor: 1, disabled: false },
    });
    const lh = Math.round((runner.lhr.categories.performance.score ?? 0) * 100);
    checks.push({
      id: p.id, name: p.name, passed: lh >= 90,
      score: Math.min(100, (lh / 90) * 100),
      detail: `Lighthouse performance ${lh}`,
    });
  } catch (e) {
    checks.push({ id: p.id, name: p.name, passed: false, score: 0, detail: `Lighthouse 运行失败：${e.message}` });
  }
}
await chrome.kill();
console.log(JSON.stringify({ dimension: 'perf', checks }, null, 2));
