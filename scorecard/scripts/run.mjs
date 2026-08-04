#!/usr/bin/env node
// 评分卡编排：环境体检 → 测试数据清扫 → Playwright/适配器 → 计分 → 报告 → history.csv
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadConfig, computeScores, evaluateVeto, evaluateFeatureCoverage,
  buildVerdict, buildReport, historyRow,
} from './score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = path.resolve(ROOT, '..');
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8880';
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin123';
const TEST_PREFIX = '[scorecard-test]';

function parseArgs(argv) {
  const args = { mode: 'patrol', feature: null, rebuild: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--mode=')) args.mode = a.slice('--mode='.length);
    else if (a.startsWith('--feature=')) args.feature = a.slice('--feature='.length);
    else if (a === '--rebuild') args.rebuild = true;
  }
  if (!['patrol', 'feature'].includes(args.mode)) {
    console.error(`❌ 未知 mode: ${args.mode}（可选 patrol / feature）`);
    process.exit(2);
  }
  if (args.mode === 'feature' && !args.feature) {
    console.error('❌ feature 模式需要 --feature=<id>');
    process.exit(2);
  }
  return args;
}

async function checkEnv() {
  const targets = [
    ['frontend', FRONTEND_URL],
    ['backend API', `${BACKEND_URL}/api/v1/categories`],
  ];
  for (const [name, url] of targets) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`❌ 环境体检失败：${name}（${url}）不可用 — ${e.message}`);
      console.error('   请先：docker compose up -d');
      console.error('   若改过代码：docker compose build frontend backend && docker compose up -d');
      process.exit(2);
    }
  }
  console.log('✅ 环境体检通过（frontend:3000 + backend:8880）');
}

function rebuild() {
  console.log('🔨 --rebuild：重建 frontend/backend 容器…');
  const b = spawnSync('docker', ['compose', 'build', 'frontend', 'backend'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
  if (b.status !== 0) { console.error('❌ docker compose build 失败'); process.exit(2); }
  const u = spawnSync('docker', ['compose', 'up', '-d', 'frontend', 'backend'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
  if (u.status !== 0) { console.error('❌ docker compose up 失败'); process.exit(2); }
  console.log('⏳ 等待容器就绪（20s）…');
  spawnSync('sleep', ['20']);
}

async function adminToken() {
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`admin 登录失败 HTTP ${res.status}`);
  const body = await res.json();
  return body.data.token;
}

/** 开场清扫：删除上次运行残留的 [scorecard-test] 文章/项目（自愈机制）。 */
async function sweepTestData() {
  let token;
  try {
    token = await adminToken();
  } catch (e) {
    console.error(`❌ 测试数据清扫失败（无法登录 admin）：${e.message}`);
    process.exit(2);
  }
  const headers = { Authorization: `Bearer ${token}` };
  // 文章（软删）：按 keyword 搜索残留
  const arts = await (await fetch(
    `${BACKEND_URL}/api/v1/admin/articles?page=1&size=100&keyword=${encodeURIComponent(TEST_PREFIX)}`,
    { headers },
  )).json();
  for (const a of arts.data?.list ?? []) {
    await fetch(`${BACKEND_URL}/api/v1/admin/articles/${a.id}`, { method: 'DELETE', headers });
    console.log(`🧹 清扫残留文章：${a.title}`);
  }
  // 项目：无搜索参数，拉全量后按前缀过滤
  const projs = await (await fetch(`${BACKEND_URL}/api/v1/admin/projects`, { headers })).json();
  for (const p of projs.data ?? []) {
    if (String(p.title ?? '').startsWith(TEST_PREFIX)) {
      await fetch(`${BACKEND_URL}/api/v1/admin/projects/${p.id}`, { method: 'DELETE', headers });
      console.log(`🧹 清扫残留项目：${p.title}`);
    }
  }
}

function runPlaywright(grep) {
  const pwConfig = path.join(ROOT, 'playwright', 'playwright.config.ts');
  if (!existsSync(pwConfig)) {
    console.warn('⚠️ Playwright 套件尚未建立，跳过（playwright/playwright.config.ts 不存在）');
    return null;
  }
  const args = ['playwright', 'test', '--reporter=json'];
  if (grep) args.push('--grep', grep);
  const r = spawnSync('npx', args, { cwd: path.join(ROOT, 'playwright'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try {
    return JSON.parse(r.stdout);
  } catch {
    console.error('❌ Playwright JSON 输出解析失败');
    console.error((r.stdout ?? '').slice(0, 2000));
    console.error((r.stderr ?? '').slice(0, 2000));
    process.exit(2);
  }
}

/** 递归展开 Playwright JSON reporter 的 suites，收集每个 spec 的标题与最终状态。 */
function collectSpecs(suite, out) {
  for (const s of suite.specs ?? []) {
    const status = s.tests?.[0]?.results?.at(-1)?.status ?? 'skipped';
    out.push({ title: s.title, status });
  }
  for (const child of suite.suites ?? []) collectSpecs(child, out);
  return out;
}

const PREFIX_TO_DIM = { F: 'functional', D: 'design', A: 'a11y', Q: 'code_quality', P: 'perf' };

function playwrightToChecks(json) {
  const specs = [];
  for (const suite of json.suites ?? []) collectSpecs(suite, specs);
  const checks = [];
  const featureCounts = {};
  for (const { title, status } of specs) {
    if (status === 'skipped') continue; // 数据守卫跳过 = 未执行，不计入分母
    const m = title.match(/\[([A-Z][\w-]*)\]/);
    if (!m) {
      console.warn(`⚠️ 跳过无评分卡 ID 的用例：${title}`);
      continue;
    }
    const id = m[1];
    const dim = PREFIX_TO_DIM[id[0]];
    if (!dim) {
      console.warn(`⚠️ 跳过未知 ID 前缀的用例：${title}`);
      continue;
    }
    checks.push({ id, name: title, dim, passed: status === 'passed' });
    const fm = title.match(/@feature:([\w-]+)/);
    if (fm) featureCounts[fm[1]] = (featureCounts[fm[1]] ?? 0) + 1;
  }
  return { checks, featureCounts };
}

function runAdapter(script) {
  const p = path.join(ROOT, script);
  if (!existsSync(p)) {
    console.warn(`⚠️ 适配器不存在，跳过：${script}`);
    return null;
  }
  const r = spawnSync('node', [p], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  try {
    const out = JSON.parse(r.stdout);
    if (!Array.isArray(out.checks)) throw new Error('输出缺少 checks 数组');
    return out.checks;
  } catch (e) {
    console.error(`❌ 适配器 ${script} 输出非法（${e.message}），终止计分（宁可失败不出分，不出假分）`);
    console.error((r.stdout ?? '').slice(0, 1000));
    console.error((r.stderr ?? '').slice(0, 1000));
    process.exit(2);
  }
}

const args = parseArgs(process.argv);
const config = loadConfig(path.join(ROOT, 'scorecard.yaml'));
const isFeature = args.mode === 'feature';

if (args.rebuild) rebuild();
await checkEnv();
await sweepTestData();

// Playwright：feature 模式只跑目标功能用例 + 核心项；巡检跑全量
const grep = isFeature ? `@feature:${args.feature}|@core` : undefined;
console.log(`🎭 运行 Playwright 套件${grep ? `（grep: ${grep}）` : '（全量）'}…`);
const pwJson = runPlaywright(grep) ?? { suites: [] };
const { checks: pwChecks, featureCounts } = playwrightToChecks(pwJson);

// 代码质量：永远全量执行（功能再小也不能把编译弄挂）
const cqChecks = runAdapter('adapters/code-quality.mjs') ?? [];
// 性能：仅巡检模式
const perfChecks = isFeature ? [] : (runAdapter('adapters/perf.mjs') ?? []);

const resultsByDimension = { functional: [], design: [], a11y: [], perf: perfChecks, code_quality: cqChecks };
for (const c of pwChecks) resultsByDimension[c.dim]?.push(c);

const activeDimensions = isFeature
  ? ['functional', 'code_quality']
  : ['functional', 'design', 'code_quality', 'a11y_perf'];
const { scores, total, warnings } = computeScores(config, resultsByDimension, activeDimensions);
const allChecks = [...pwChecks, ...cqChecks, ...perfChecks];
const veto = evaluateVeto(config, allChecks);
// feature 模式只校验目标功能的用例数，避免其他功能误报
const counts = isFeature ? { [args.feature]: featureCounts[args.feature] ?? 0 } : featureCounts;
const featureFailures = evaluateFeatureCoverage(config, counts);
const verdict = buildVerdict(config, total, veto, featureFailures);

const now = new Date();
const timestamp = now.toISOString().replace('T', ' ').slice(0, 16);
const stamp = now.toISOString().replace(/[-:TZ]/g, '').slice(0, 12);
const modeLabel = isFeature ? `功能验收（${args.feature}）` : '全站巡检';
const report = buildReport({ config, mode: modeLabel, timestamp, scores, total, veto, featureFailures, allChecks, warnings });

const reportsDir = path.join(ROOT, 'reports');
mkdirSync(reportsDir, { recursive: true });
const reportPath = path.join(reportsDir, `${stamp}-${isFeature ? `feature-${args.feature}` : 'patrol'}.md`);
writeFileSync(reportPath, report);

const scoresDir = path.join(PROJECT_ROOT, 'scores');
mkdirSync(scoresDir, { recursive: true });
const csvPath = path.join(scoresDir, 'history.csv');
if (!existsSync(csvPath)) {
  writeFileSync(csvPath, 'date,mode,total,functional,design,code_quality,a11y_perf,passed\n');
}
appendFileSync(csvPath, `${historyRow({
  timestamp: now.toISOString(), mode: isFeature ? `feature:${args.feature}` : 'patrol',
  total, scores, passed: verdict.passed,
})}\n`);

console.log('');
console.log(report);
console.log('');
console.log(`📄 报告：${path.relative(PROJECT_ROOT, reportPath)}`);
console.log(`📈 历史：scores/history.csv`);
process.exit(verdict.passed ? 0 : 1);
