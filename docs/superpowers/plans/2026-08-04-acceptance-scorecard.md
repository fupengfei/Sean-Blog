# Vibe Coding 验收评分卡 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **开始实现前先按 superpowers:using-git-worktrees 创建隔离 worktree**（用户明确要求），在 worktree 内完成全部任务，最后合并回 master。

**Goal:** 建立一套四维加权（功能/设计/代码质量/可访问性+性能）+ 核心项一票否决的自动化验收评分卡，支持单功能验收与全站巡检两种模式，AI 可自主运行并闭环修复。

**Architecture:** `scorecard/scorecard.yaml` 是唯一事实源（维度/权重/否决项/功能登记）；Playwright 套件承载功能、设计响应式、可访问性三个维度的用例，两个 Node 适配器（code-quality / perf）输出统一 JSON；`scripts/run.mjs` 编排全流程（环境体检 → 测试数据清扫 → 各维度执行 → 计分 → Markdown 报告 + history.csv）。

**Tech Stack:** Node 22（原生 fetch/WebSocket）、Playwright（@playwright/test）、@axe-core/playwright、lighthouse + chrome-launcher、yaml（YAML 解析）、node:test（计分逻辑单测）、ESLint（eslint-config-next）。

**Spec:** `docs/superpowers/specs/2026-08-04-acceptance-scorecard-design.md`

## Global Constraints

- **baseURL**：Playwright 对 `http://localhost:3000`（docker compose 的 frontend 容器）；后端 API 直连 `http://localhost:8880`。本地 compose **没有 Nginx**，不要假设 80 端口
- **Admin 凭据**：`admin` / `admin123`（docker-compose.yml 默认值）
- **用例命名契约**：标题必须带稳定 ID 前缀 `[X-name-nn]` 并打维度标签。前缀归属：`F`=功能、`D`=设计、`A`=可访问性、`Q`=代码质量、`P`=性能；标签 `@functional` / `@design` / `@a11y` / `@core` / `@writes` / `@feature:<id>`
- **否决项判定以 yaml `core_checks` 为准**；标题里的 `@core` 只是可读性标记
- **权重**：functional 0.40 / design 0.25 / code_quality 0.20 / a11y_perf 0.15（内部 a11y 0.5 + perf 0.5）
- **通过线**：总分 ≥ 80 且 core_checks 全过 且 每个登记功能执行用例数 ≥ min_tests
- **测试数据安全**：只读优先；仅文章/项目（有删除 API）允许写入测试，标题必须带 `[scorecard-test]` 前缀，用例自带 teardown，run.mjs 开场清扫残留。访问日志/简历请求记录严格只读
- **报告产物**：`scorecard/reports/*.md` 与 `scores/history.csv` 提交进 git；Playwright 截图基线（`*-snapshots/`）gitignore
- **失败必须可见**：Playwright 不设重试（retries: 0）；适配器输出非法时终止不出分
- **提交信息**：中文 + conventional 前缀，结尾带 Co-Authored-By 行（本计划各任务的 commit 命令已含）

## File Structure

| 文件 | 职责 |
|------|------|
| `scorecard/package.json` | 评分卡依赖与 npm scripts（check:all / check:feature / test） |
| `scorecard/scorecard.yaml` | 唯一事实源：维度/权重/否决项/功能登记 |
| `scorecard/scripts/score.mjs` | 计分核心纯函数（单测覆盖） |
| `scorecard/scripts/score.test.mjs` | score.mjs 的 node:test 单元测试 |
| `scorecard/scripts/run.mjs` | 编排：环境体检 → 清扫 → Playwright/适配器 → 计分 → 报告 → history.csv |
| `scorecard/playwright/playwright.config.ts` | Playwright 配置（baseURL 3000、timeout 30s、retries 0） |
| `scorecard/playwright/support/api.ts` | 后端 API 读取助手（只读） |
| `scorecard/playwright/functional/*.spec.ts` | 功能完成度用例 |
| `scorecard/playwright/design/*.spec.ts` | 设计还原 + 响应式用例 |
| `scorecard/playwright/a11y/a11y.spec.ts` | 可访问性用例 |
| `scorecard/adapters/code-quality.mjs` | 代码质量适配器（tsc/eslint/console.log/mvn） |
| `scorecard/adapters/perf.mjs` | 性能适配器（Lighthouse） |
| `frontend/.eslintrc.json` | ESLint 配置（extends next/core-web-vitals） |
| `scorecard/eslint-baseline.json` | ESLint 存量告警基线（运行时生成） |
| `scores/history.csv` | 历史分数（git 追踪） |
| `.claude/skills/acceptance-scorecard/SKILL.md` | 项目 Skill：AI 自主验收流程 |

---

### Task 1: scorecard 包脚手架 + 计分核心（TDD）

**Files:**
- Create: `scorecard/package.json`
- Create: `scorecard/.gitignore`
- Create: `scorecard/scorecard.yaml`
- Test: `scorecard/scripts/score.test.mjs`
- Create: `scorecard/scripts/score.mjs`

**Interfaces:**
- Produces: `loadConfig(configPath) -> object`、`dimensionScore(checks) -> number`、`computeScores(config, resultsByDimension, activeDimensions) -> {scores, total, warnings}`、`evaluateVeto(config, allChecks) -> {vetoed, failed}`、`evaluateFeatureCoverage(config, featureCounts) -> Array<{id, min, actual}>`、`buildVerdict(config, total, veto, featureFailures) -> {passed, total, veto, featureFailures}`、`buildReport(opts) -> string`、`historyRow(opts) -> string`。Check 对象形状：`{id, name, passed, score?, detail?}`。后续所有任务依赖这些签名。

- [ ] **Step 1: 创建 package.json 与 .gitignore**

`scorecard/package.json`：

```json
{
  "name": "sean-blog-scorecard",
  "private": true,
  "type": "module",
  "scripts": {
    "check:all": "node scripts/run.mjs --mode=patrol",
    "check:feature": "node scripts/run.mjs --mode=feature",
    "test": "node --test scripts/"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.9.0",
    "@playwright/test": "^1.45.0",
    "chrome-launcher": "^1.1.0",
    "lighthouse": "^12.2.0",
    "yaml": "^2.4.0"
  }
}
```

`scorecard/.gitignore`：

```
node_modules/
playwright/**/*-snapshots/
test-results/
```

- [ ] **Step 2: 创建 scorecard.yaml（唯一事实源）**

`scorecard/scorecard.yaml`：

```yaml
version: 1
pass_threshold: 80

dimensions:
  functional:
    weight: 0.40
    runner: playwright
    tag: "@functional"
  design:
    weight: 0.25
    runner: playwright
    tag: "@design"
  code_quality:
    weight: 0.20
    runner: adapters/code-quality.mjs
  a11y_perf:
    weight: 0.15
    sub_weights:
      a11y: 0.5
      perf: 0.5

# 一票否决项：任一失败 → 整次验收不通过，与总分无关。判定以此列表为准。
core_checks:
  - F-home-01     # 首页可打开且核心区块渲染
  - F-blog-01     # 文章列表加载出数据
  - F-detail-01   # 文章详情 MD 渲染成功
  - F-admin-01    # Admin 登录成功
  - Q-fe-01       # tsc --noEmit 零错误

# 功能登记：新功能在这里登记 id/desc/min_tests，用例打 @feature:<id> 标签。
# 巡检模式下每个登记功能执行用例数 < min_tests 判失败（防静默漏测）。
features: []

# 已知合理偏差（断言以实现约定为准，不照抄设计稿）：
# - NavBar 为 sticky（h-20 占文档流 80px），设计稿为 fixed
# - 页面顶部留白 pt-12（48px），设计稿 pt-32 是给 fixed 导航的补偿，不适用
```

- [ ] **Step 3: 写失败测试 — score.test.mjs**

`scorecard/scripts/score.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dimensionScore,
  computeScores,
  evaluateVeto,
  evaluateFeatureCoverage,
  buildVerdict,
  buildReport,
  historyRow,
} from './score.mjs';

const CONFIG = {
  pass_threshold: 80,
  dimensions: {
    functional: { weight: 0.4 },
    design: { weight: 0.25 },
    code_quality: { weight: 0.2 },
    a11y_perf: { weight: 0.15, sub_weights: { a11y: 0.5, perf: 0.5 } },
  },
  core_checks: ['F-home-01', 'Q-fe-01'],
  features: [{ id: 'demo', desc: 'demo', min_tests: 2 }],
};

const ALL_DIMS = ['functional', 'design', 'code_quality', 'a11y_perf'];

test('dimensionScore：通过率 × 100', () => {
  const checks = [
    { id: 'F-1', name: 'a', passed: true },
    { id: 'F-2', name: 'b', passed: true },
    { id: 'F-3', name: 'c', passed: false },
  ];
  assert.equal(dimensionScore(checks), 200 / 3);
});

test('dimensionScore：全部带数字 score 时取平均（perf 线性计分）', () => {
  const checks = [
    { id: 'P-1', name: 'a', passed: true, score: 100 },
    { id: 'P-2', name: 'b', passed: false, score: 50 },
  ];
  assert.equal(dimensionScore(checks), 75);
});

test('dimensionScore：空数组得 0 分', () => {
  assert.equal(dimensionScore([]), 0);
});

test('computeScores：加权总分（全维度满分 → 100）', () => {
  const results = {
    functional: [{ id: 'F-1', name: 'x', passed: true }],
    design: [{ id: 'D-1', name: 'x', passed: true }],
    code_quality: [{ id: 'Q-1', name: 'x', passed: true }],
    a11y: [{ id: 'A-1', name: 'x', passed: true }],
    perf: [{ id: 'P-1', name: 'x', passed: true, score: 100 }],
  };
  const { scores, total, warnings } = computeScores(CONFIG, results, ALL_DIMS);
  assert.equal(scores.functional, 100);
  assert.equal(scores.a11y_perf, 100);
  assert.equal(total, 100);
  assert.deepEqual(warnings, []);
});

test('computeScores：未激活维度不参与加权（feature 模式权重归一）', () => {
  const results = {
    functional: [{ id: 'F-1', name: 'x', passed: true }],
    code_quality: [{ id: 'Q-1', name: 'x', passed: true }],
  };
  const { total } = computeScores(CONFIG, results, ['functional', 'code_quality']);
  assert.equal(total, 100); // 0.4+0.2 归一后仍是全满分
});

test('computeScores：激活但无用例的维度记 0 分并警告', () => {
  const results = { functional: [{ id: 'F-1', name: 'x', passed: true }] };
  const { scores, total, warnings } = computeScores(CONFIG, results, ['functional', 'design']);
  assert.equal(scores.design, 0);
  assert.equal(total, (0.4 * 100) / (0.4 + 0.25));
  assert.ok(warnings.some((w) => w.includes('design')));
});

test('computeScores：a11y_perf 缺半边时按现存半边归一', () => {
  const results = {
    functional: [], design: [], code_quality: [],
    a11y: [{ id: 'A-1', name: 'x', passed: true }],
    perf: [],
  };
  const { scores, warnings } = computeScores(CONFIG, results, ALL_DIMS);
  assert.equal(scores.a11y_perf, 100);
  assert.ok(warnings.some((w) => w.includes('a11y_perf')));
});

test('evaluateVeto：核心项失败 → vetoed', () => {
  const checks = [
    { id: 'F-home-01', name: 'x', passed: false },
    { id: 'Q-fe-01', name: 'x', passed: true },
  ];
  const veto = evaluateVeto(CONFIG, checks);
  assert.equal(veto.vetoed, true);
  assert.deepEqual(veto.failed, ['F-home-01']);
});

test('evaluateVeto：核心项缺失（未执行）也算否决', () => {
  const veto = evaluateVeto(CONFIG, [{ id: 'F-home-01', name: 'x', passed: true }]);
  assert.equal(veto.vetoed, true);
  assert.deepEqual(veto.failed, ['Q-fe-01']);
});

test('evaluateFeatureCoverage：用例数不足 → 失败清单', () => {
  const failures = evaluateFeatureCoverage(CONFIG, { demo: 1 });
  assert.deepEqual(failures, [{ id: 'demo', min: 2, actual: 1 }]);
});

test('buildVerdict：阈值边界 79.9 不过 / 80 过', () => {
  const veto = { vetoed: false, failed: [] };
  assert.equal(buildVerdict(CONFIG, 79.9, veto, []).passed, false);
  assert.equal(buildVerdict(CONFIG, 80, veto, []).passed, true);
});

test('buildVerdict：总分达标但被否决 → 不过', () => {
  const veto = { vetoed: true, failed: ['F-home-01'] };
  assert.equal(buildVerdict(CONFIG, 95, veto, []).passed, false);
});

test('buildReport：包含总分、维度表、失败清单', () => {
  const allChecks = [
    { id: 'F-1', name: '[F-1] 某用例 @functional', passed: true, dim: 'functional' },
    { id: 'D-1', name: '[D-1] 坏用例 @design', passed: false, dim: 'design' },
  ];
  const report = buildReport({
    config: CONFIG, mode: '全站巡检', timestamp: '2026-08-04 15:30',
    scores: { functional: 100, design: 0, code_quality: 100, a11y_perf: 100 },
    total: 75, veto: { vetoed: false, failed: [] }, featureFailures: [],
    allChecks, warnings: [],
  });
  assert.ok(report.includes('总分: 75.0'));
  assert.ok(report.includes('❌'));
  assert.ok(report.includes('D-1'));
});

test('historyRow：CSV 列顺序正确', () => {
  const row = historyRow({
    timestamp: '2026-08-04T15:30:00Z', mode: 'patrol', total: 87.5,
    scores: { functional: 95, design: 82, code_quality: 100, a11y_perf: 60 },
    passed: true,
  });
  assert.equal(row, '2026-08-04T15:30:00Z,patrol,87.5,95,82,100,60,true');
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `cd scorecard && npm install && npm test`
Expected: 安装成功；`npm test` 报错 `Cannot find module './score.mjs'`（score.mjs 尚不存在）

- [ ] **Step 5: 实现 score.mjs 使测试通过**

`scorecard/scripts/score.mjs`：

```js
// 评分卡计分核心：纯函数，node:test 单测覆盖（score.test.mjs）。
// run.mjs 负责编排与 IO，本文件不做任何 IO（loadConfig 除外）。
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

export function loadConfig(configPath) {
  const config = YAML.parse(readFileSync(configPath, 'utf8'));
  if (typeof config.pass_threshold !== 'number') {
    throw new Error('scorecard.yaml 缺少 pass_threshold');
  }
  return config;
}

/**
 * 维度分：
 * - 所有 check 都带数字 score → 取平均（perf 线性计分）
 * - 否则通过率 × 100
 * - 空数组 → 0
 */
export function dimensionScore(checks) {
  if (!checks || checks.length === 0) return 0;
  const numeric = checks.filter((c) => typeof c.score === 'number');
  if (numeric.length === checks.length) {
    return checks.reduce((s, c) => s + c.score, 0) / checks.length;
  }
  const passed = checks.filter((c) => c.passed).length;
  return (passed / checks.length) * 100;
}

/**
 * 各维度得分 + 加权总分。
 * activeDimensions：本次运行激活的维度（feature 模式只激活部分）。
 * 未激活维度不参与加权（权重归一）；激活但无用例的维度记 0 分并警告。
 */
export function computeScores(config, resultsByDimension, activeDimensions) {
  const scores = {};
  const warnings = [];
  let weighted = 0;
  let weightSum = 0;
  for (const [name, dim] of Object.entries(config.dimensions)) {
    if (!activeDimensions.includes(name)) continue;
    let score;
    if (name === 'a11y_perf') {
      const parts = [];
      const a11yChecks = resultsByDimension.a11y ?? [];
      const perfChecks = resultsByDimension.perf ?? [];
      if (a11yChecks.length > 0) parts.push({ w: dim.sub_weights.a11y, s: dimensionScore(a11yChecks) });
      if (perfChecks.length > 0) parts.push({ w: dim.sub_weights.perf, s: dimensionScore(perfChecks) });
      if (parts.length === 0) {
        warnings.push('维度 a11y_perf 无用例，按 0 分计');
        score = 0;
      } else {
        if (parts.length < 2) warnings.push('维度 a11y_perf 缺失一半（a11y 或 perf），按现存半边归一计分');
        const wSum = parts.reduce((s, p) => s + p.w, 0);
        score = parts.reduce((s, p) => s + (p.w * p.s) / wSum, 0);
      }
    } else {
      const checks = resultsByDimension[name] ?? [];
      if (checks.length === 0) {
        warnings.push(`维度 ${name} 无用例，按 0 分计`);
        score = 0;
      } else {
        score = dimensionScore(checks);
      }
    }
    scores[name] = Math.round(score * 10) / 10;
    weighted += dim.weight * score;
    weightSum += dim.weight;
  }
  const total = weightSum > 0 ? weighted / weightSum : 0;
  return { scores, total: Math.round(total * 10) / 10, warnings };
}

/** 一票否决：core_checks 中的 id 缺失（未执行）或失败都算否决。 */
export function evaluateVeto(config, allChecks) {
  const byId = new Map(allChecks.map((c) => [c.id, c]));
  const failed = [];
  for (const id of config.core_checks ?? []) {
    const c = byId.get(id);
    if (!c || !c.passed) failed.push(id);
  }
  return { vetoed: failed.length > 0, failed };
}

/** 功能登记防漏测：每个 feature 执行用例数 >= min_tests。 */
export function evaluateFeatureCoverage(config, featureCounts) {
  const failures = [];
  for (const f of config.features ?? []) {
    const actual = featureCounts[f.id] ?? 0;
    if (actual < f.min_tests) failures.push({ id: f.id, min: f.min_tests, actual });
  }
  return failures;
}

export function buildVerdict(config, total, veto, featureFailures) {
  const passed = total >= config.pass_threshold && !veto.vetoed && featureFailures.length === 0;
  return { passed, total, veto, featureFailures };
}

const DIM_LABELS = {
  functional: '功能完成度',
  design: '设计还原+响应式',
  code_quality: '代码质量',
  a11y_perf: '可访问性+性能',
};

export function buildReport({ config, mode, timestamp, scores, total, veto, featureFailures, allChecks, warnings }) {
  const passed = total >= config.pass_threshold && !veto.vetoed && featureFailures.length === 0;
  const lines = [];
  lines.push(`# 验收报告 — ${mode} | ${timestamp}`);
  lines.push('');
  lines.push(`总分: ${total.toFixed(1)} / 100  ${passed ? '✅ 通过' : '❌ 未通过'}`);
  if (veto.vetoed) {
    lines.push('');
    lines.push(`**一票否决**：核心项失败/未执行 — ${veto.failed.join(', ')}`);
  }
  if (featureFailures.length > 0) {
    lines.push('');
    lines.push(`**用例不足**：${featureFailures.map((f) => `${f.id}（${f.actual}/${f.min}）`).join('、')}`);
  }
  lines.push('');
  lines.push('| 维度 | 得分 | 权重 | 加权 |');
  lines.push('|------|------|------|------|');
  for (const [name, dim] of Object.entries(config.dimensions)) {
    const s = scores[name];
    if (s === undefined) {
      lines.push(`| ${DIM_LABELS[name] ?? name} | —（未激活） | ${dim.weight} | — |`);
    } else {
      lines.push(`| ${DIM_LABELS[name] ?? name} | ${s.toFixed(1)} | ${dim.weight} | ${(s * dim.weight).toFixed(1)} |`);
    }
  }
  const failures = allChecks.filter((c) => !c.passed);
  lines.push('');
  if (failures.length === 0) {
    lines.push('## 失败清单');
    lines.push('');
    lines.push('无 🎉');
  } else {
    lines.push('## 失败清单');
    lines.push('');
    for (const f of failures) {
      lines.push(`- **[${f.id}]** ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    }
  }
  if (warnings.length > 0) {
    lines.push('');
    lines.push('## 警告');
    lines.push('');
    for (const w of warnings) lines.push(`- ${w}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function historyRow({ timestamp, mode, total, scores, passed }) {
  return [
    timestamp,
    mode,
    total,
    scores.functional ?? '',
    scores.design ?? '',
    scores.code_quality ?? '',
    scores.a11y_perf ?? '',
    passed,
  ].join(',');
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd scorecard && npm test`
Expected: 全部 13 个测试 PASS

- [ ] **Step 7: Commit**

```bash
git add scorecard/package.json scorecard/package-lock.json scorecard/.gitignore scorecard/scorecard.yaml scorecard/scripts/score.mjs scorecard/scripts/score.test.mjs
git commit -m "feat(scorecard): 评分卡脚手架 + 计分核心（TDD，13 项单测）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: run.mjs 编排（环境体检 / 数据清扫 / 报告产出）

**Files:**
- Create: `scorecard/scripts/run.mjs`

**Interfaces:**
- Consumes: Task 1 的 `loadConfig/computeScores/evaluateVeto/evaluateFeatureCoverage/buildVerdict/buildReport/historyRow`（签名见 Task 1 Interfaces）
- Produces: CLI `node scripts/run.mjs --mode=patrol | --mode=feature --feature=<id> [--rebuild]`；运行 `npx playwright test --reporter=json [--grep <pattern>]`（Task 3 起有用例）；运行 `node adapters/*.mjs`（Task 6/8 起存在，不存在则跳过该维度并警告）；写 `scorecard/reports/<stamp>-<mode>.md` 与 `scores/history.csv`（首行表头 `date,mode,total,functional,design,code_quality,a11y_perf,passed`）；退出码 0=通过 / 1=未通过 / 2=环境或流程错误

- [ ] **Step 1: 实现 run.mjs**

`scorecard/scripts/run.mjs`：

```js
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
const pwJson = runPlaywright(grep);
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
```

- [ ] **Step 2: 冒烟验证编排链路（此时无用例无适配器，应报 0 分并退出码 1）**

前置：docker compose 栈已启动（`docker compose ps` 确认 frontend/backend healthy）。

Run: `cd scorecard && node scripts/run.mjs --mode=patrol; echo "exit=$?"`
Expected:
- 输出 `✅ 环境体检通过`、Playwright 0 用例、两条 `⚠️ 适配器不存在，跳过`
- 报告含 `总分: 0.0 / 100 ❌ 未通过`、**一票否决**（核心项未执行）、多条「无用例，按 0 分计」警告
- `scores/history.csv` 新增一行、`scorecard/reports/` 下生成一个 `*-patrol.md`
- `exit=1`

若栈没起：输出环境体检失败并 `exit=2`（同样符合设计）。

- [ ] **Step 3: Commit**

```bash
git add scorecard/scripts/run.mjs scores/history.csv scorecard/reports/
git commit -m "feat(scorecard): run.mjs 编排 — 环境体检/数据清扫/双模式/报告与历史

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Playwright 配置 + 公共页功能用例

**Files:**
- Create: `scorecard/playwright/playwright.config.ts`
- Create: `scorecard/playwright/support/api.ts`
- Create: `scorecard/playwright/functional/home.spec.ts`
- Create: `scorecard/playwright/functional/blog.spec.ts`
- Create: `scorecard/playwright/functional/blog-detail.spec.ts`
- Create: `scorecard/playwright/functional/skills.spec.ts`
- Create: `scorecard/playwright/functional/projects.spec.ts`

**Interfaces:**
- Consumes: run.mjs 用 `npx playwright test --reporter=json [--grep]` 调用本目录；用例标题契约 `[X-name-nn] … @tag`（见 Global Constraints）
- Produces: 功能维度用例 `F-home-01..03`、`F-blog-01..04`、`F-detail-01..02`、`F-skills-01..02`、`F-projects-01..02`；其中 `F-home-01`、`F-blog-01`、`F-detail-01` 是否决项

注意：本任务断言的是**现有已上线行为**。若某条用例因选择器与实际 DOM 不符而失败，先对照 `frontend/src/components/` 下对应组件的真实结构修正选择器，**不得放宽断言语义**；若失败揭示的是真实产品缺陷，记录下来留给验收时处理，不要在本任务里改产品代码。

- [ ] **Step 1: playwright.config.ts 与 support/api.ts**

`scorecard/playwright/playwright.config.ts`：

```ts
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
```

`scorecard/playwright/support/api.ts`：

```ts
// 后端只读 API 助手：数据驱动断言（先问 API 要事实，再断言页面呈现一致）。
export const BACKEND = 'http://localhost:8880';

export interface PageResult<T> { list: T[]; total: number; page: number; size: number; }
export interface Article { id: string; slug?: string; title: string; [k: string]: unknown; }
export interface Project { id: string; title: string; url?: string; githubUrl?: string; [k: string]: unknown; }
export interface Category { id: string; name: string; slug: string; [k: string]: unknown; }
export interface FileBundle { id: string; name: string; [k: string]: unknown; }

/** GET 后端公开 API，返回 Result<T> 里的 data。 */
export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`);
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
  const body = await res.json();
  return body.data as T;
}
```

- [ ] **Step 2: home.spec.ts**

`scorecard/playwright/functional/home.spec.ts`：

```ts
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

test('[F-home-03] 首页 ContactSection 联系表单可用 @functional', async ({ page }) => {
  // 产品演进：ContactSection 取代原 CTASection（简历弹窗已废弃），
  // 选择器以 frontend/src/components/home/ContactSection.tsx 实际 DOM 为准
  await page.goto('/');
  await expect(page.getByPlaceholder(/姓名|Name/i).first()).toBeVisible();
  await expect(page.getByPlaceholder(/邮箱|Email/i).first()).toBeVisible();
});
```

- [ ] **Step 3: blog.spec.ts**

`scorecard/playwright/functional/blog.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, Category, PageResult } from '../support/api';

test('[F-blog-01] 文章列表加载出数据 @functional @core', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  await page.goto('/blog');
  if (res.total > 0) {
    await expect(page.getByText(res.list[0].title)).toBeVisible();
  } else {
    await expect(page.getByText('文章即将发布')).toBeVisible(); // 空状态文案
  }
});

test('[F-blog-02] 分类筛选：点击分类后列表刷新不报错 @functional', async ({ page }) => {
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

test('[F-blog-03] 卡片视图/列表视图切换 @functional', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  test.skip(res.total === 0, '无文章数据');
  await page.goto('/blog');
  const listToggle = page.locator('button[title], button[aria-label]').filter({ has: page.locator('svg') }).last();
  await listToggle.click();
  await expect(page.locator('main')).toBeVisible();
});

test('[F-blog-04] 分页切换 @functional', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=10');
  // 不足一页不显示分页器（项目约定），此时跳过
  test.skip(res.total <= 10, '文章不足一页，无分页器');
  await page.goto('/blog');
  await page.getByRole('button', { name: '2' }).click();
  // 第 2 页加载后列表区仍正常渲染
  await expect(page.locator('main')).toBeVisible();
});
```

- [ ] **Step 4: blog-detail.spec.ts**

`scorecard/playwright/functional/blog-detail.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, PageResult } from '../support/api';

test('[F-detail-01] 文章详情 MD 渲染成功 @functional @core', async ({ page }) => {
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  await page.goto(`/blog/${a.slug ?? a.id}`);
  await expect(page.getByRole('heading', { name: a.title })).toBeVisible();
  // MD 正文容器（prose 排版）存在
  await expect(page.locator('.prose, article').first()).toBeVisible();
});

test('[F-detail-02] 详情页 Footer 齐全且故意无 NavBar @functional', async ({ page }) => {
  // 产品决策（2026-08-04）：文章详情页不含 NavBar，沉浸式阅读；此用例固化该决策
  const res = await api<PageResult<Article>>('/api/v1/articles?page=1&size=1');
  test.skip(res.total === 0, '无文章数据');
  const a = res.list[0];
  await page.goto(`/blog/${a.id}`);
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('header.sticky')).toHaveCount(0);
});
```

- [ ] **Step 5: skills.spec.ts**

`scorecard/playwright/functional/skills.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { FileBundle } from '../support/api';

test('[F-skills-01] Skill 列表页加载 @functional', async ({ page }) => {
  const bundles = await api<FileBundle[]>('/api/v1/bundles');
  await page.goto('/blog/skills');
  if (bundles.length > 0) {
    await expect(page.getByText(bundles[0].name)).toBeVisible();
  } else {
    await expect(page.locator('main')).toBeVisible(); // 空状态也应正常渲染
  }
});

test('[F-skills-02] Skill 文件树浏览页可打开 @functional', async ({ page }) => {
  const bundles = await api<FileBundle[]>('/api/v1/bundles');
  test.skip(bundles.length === 0, '无 Skill Bundle 数据');
  await page.goto(`/blog/skills/${bundles[0].id}`);
  // 左树右内容布局：页面正常渲染且不报错
  await expect(page.locator('main')).toBeVisible();
});
```

- [ ] **Step 6: projects.spec.ts**

`scorecard/playwright/functional/projects.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Project } from '../support/api';

test('[F-projects-01] 项目卡片渲染出数据 @functional', async ({ page }) => {
  const projects = await api<Project[]>('/api/v1/projects');
  await page.goto('/projects');
  if (projects.length > 0) {
    await expect(page.getByText(projects[0].title)).toBeVisible();
  } else {
    await expect(page.locator('main')).toBeVisible();
  }
});

test('[F-projects-02] 项目卡片含外链 @functional', async ({ page }) => {
  const projects = await api<Project[]>('/api/v1/projects');
  const withLink = projects.find((p) => p.url || p.githubUrl);
  test.skip(!withLink, '所有项目均无外链');
  await page.goto('/projects');
  const href = (withLink!.url ?? withLink!.githubUrl)!;
  await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
});
```

- [ ] **Step 7: 安装 Playwright 浏览器并运行功能用例**

Run:
```bash
cd scorecard && npx playwright install chromium
cd scorecard/playwright && npx playwright test functional/
```
Expected: 全部用例通过（或个别选择器需按实际 DOM 微调——见本任务开头注意事项；数据为空的用例显示 skipped 属正常）。

- [ ] **Step 8: Commit**

```bash
git add scorecard/playwright/playwright.config.ts scorecard/playwright/support/ scorecard/playwright/functional/
git commit -m "feat(scorecard): Playwright 配置 + 公共页功能用例（5 页面 13 用例）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Admin 功能用例（登录 + 文章 CRUD 闭环）

**Files:**
- Create: `scorecard/playwright/functional/admin.spec.ts`
- Create: `scorecard/playwright/support/admin-api.ts`

**Interfaces:**
- Consumes: Task 3 的 playwright.config.ts；后端 `POST /api/v1/admin/login` → `Result<{token, expiresIn}>`；`POST /api/v1/admin/articles`（multipart: file + title）→ `Result<Article>`；`GET /api/v1/admin/articles?page=1&size=100&keyword=` → `Result<PageResult<Article>>`；`DELETE /api/v1/admin/articles/{id}` → `Result<void>`
- Produces: `F-admin-01`（否决项）、`F-admin-02`、`F-admin-03`（@writes 标签）；admin-api.ts 导出 `loginAdmin(request): Promise<string>`（返回 token）与 `adminHeaders(token)`

写入安全规则（务必遵守）：仅创建标题以 `[scorecard-test]` 开头的文章；teardown 删除；run.mjs 开场清扫兜底。

- [ ] **Step 1: support/admin-api.ts**

`scorecard/playwright/support/admin-api.ts`：

```ts
import type { APIRequestContext } from '@playwright/test';
import { BACKEND } from './api';

export const TEST_PREFIX = '[scorecard-test]';

export async function loginAdmin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/api/v1/admin/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  if (!res.ok()) throw new Error(`admin 登录失败 HTTP ${res.status()}`);
  const body = await res.json();
  return body.data.token as string;
}

export function adminHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
```

- [ ] **Step 2: admin.spec.ts**

`scorecard/playwright/functional/admin.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { BACKEND } from '../support/api';
import { loginAdmin, adminHeaders, TEST_PREFIX } from '../support/admin-api';

test('[F-admin-01] Admin 登录成功 @functional @core', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: /登录|登 录/ }).click();
  await page.waitForURL('**/admin/**', { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/admin\/login/);
});

test('[F-admin-02] 登录失败给出错误提示 @functional', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('wrong-password');
  await page.getByRole('button', { name: /登录|登 录/ }).click();
  await expect(page).toHaveURL(/\/admin\/login/); // 仍停留在登录页
});

test('[F-admin-03] 文章创建-后台可见-删除-公开不可见闭环 @functional @writes', async ({ request }) => {
  const token = await loginAdmin(request);
  const headers = adminHeaders(token);
  const title = `${TEST_PREFIX} 自动验收文章`;
  let articleId: string | null = null;
  try {
    // 1) 创建（multipart：file 必填）
    const create = await request.post(`${BACKEND}/api/v1/admin/articles`, {
      headers,
      multipart: {
        file: {
          name: 'article.md',
          mimeType: 'text/markdown',
          buffer: Buffer.from(`# ${title}\n\n这是自动化验收创建的测试文章。`),
        },
        title,
      },
    });
    expect(create.ok(), `创建失败: ${await create.text()}`).toBeTruthy();
    const created = await create.json();
    articleId = String(created.data.id);
    expect(created.data.title).toBe(title);

    // 2) 后台列表可见
    const list = await request.get(
      `${BACKEND}/api/v1/admin/articles?page=1&size=100&keyword=${encodeURIComponent(TEST_PREFIX)}`,
      { headers },
    );
    const titles = ((await list.json()).data.list ?? []).map((a: { title: string }) => a.title);
    expect(titles).toContain(title);

    // 3) 删除（软删）
    const del = await request.delete(`${BACKEND}/api/v1/admin/articles/${articleId}`, { headers });
    expect(del.ok()).toBeTruthy();
    articleId = null; // 已清理，teardown 不再重复删

    // 4) 前台公开列表不可见
    const pub = await fetch(`${BACKEND}/api/v1/articles?page=1&size=100`);
    const pubTitles = ((await pub.json()).data.list ?? []).map((a: { title: string }) => a.title);
    expect(pubTitles).not.toContain(title);
  } finally {
    if (articleId) {
      await request.delete(`${BACKEND}/api/v1/admin/articles/${articleId}`, { headers });
    }
  }
});
```

- [ ] **Step 3: 运行 admin 用例**

Run: `cd scorecard/playwright && npx playwright test functional/admin.spec.ts`
Expected: 3 个用例全部通过；运行后 `GET /api/v1/admin/articles?keyword=[scorecard-test]` 无残留（可 curl 验证）

- [ ] **Step 4: Commit**

```bash
git add scorecard/playwright/functional/admin.spec.ts scorecard/playwright/support/admin-api.ts
git commit -m "feat(scorecard): Admin 功能用例 — 登录/失败提示/文章 CRUD 闭环（含清扫）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 设计还原 + 响应式维度

**Files:**
- Create: `scorecard/playwright/design/design-system.spec.ts`
- Create: `scorecard/playwright/design/responsive.spec.ts`
- Create（首次运行生成）: `scorecard/playwright/design/*-snapshots/`（gitignore，见 Task 1 的 .gitignore）

**Interfaces:**
- Consumes: Task 3 的 playwright.config.ts（`expect.toHaveScreenshot.maxDiffPixelRatio = 0.01`）
- Produces: 设计维度用例 `D-nav-01`、`D-layout-01..02`、`D-color-01`、`D-card-01`、`D-font-01`、`D-spacing-01`、`D-resp-01..04`、`D-shot-01..05`

断言依据：`CLAUDE.md` 设计规范（Navy #002045、卡片边框 1px solid #E2E8F0、Inter + Source Serif 4、8px 间距、页面 1200px / 文章列 720px）与 scorecard.yaml 中的已知偏差注释（sticky NavBar h-20=80px）。

- [ ] **Step 1: design-system.spec.ts**

`scorecard/playwright/design/design-system.spec.ts`：

```ts
import { test, expect } from '@playwright/test';
import { api } from '../support/api';
import type { Article, PageResult } from '../support/api';

test('[D-nav-01] NavBar sticky 且高 80px @design', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header.sticky');
  await expect(header).toBeVisible();
  const height = await header.evaluate((el) => el.getBoundingClientRect().height);
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
  await page.goto(`/blog/${a.slug ?? a.id}`);
  // 正文容器：宽度不超过 720
  const width = await page.locator('.prose, article').first()
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
  await page.goto(`/blog/${a.slug ?? a.id}`);
  const proseFont = await page.locator('.prose, article').first()
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
```

- [ ] **Step 2: responsive.spec.ts**

`scorecard/playwright/design/responsive.spec.ts`：

```ts
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
```

- [ ] **Step 3: 生成视觉基线（首次）**

Run: `cd scorecard/playwright && npx playwright test design/ --update-snapshots`
Expected: 全部通过，`design/design-system.spec.ts-snapshots/` 与 `design/responsive.spec.ts-snapshots/` 下生成 5 张基线 PNG

- [ ] **Step 4: 常规复跑确认基线可用**

Run: `cd scorecard/playwright && npx playwright test design/`
Expected: 全部通过（截图对比命中基线）。若某个断言暴露真实设计偏差（如间距非 8 倍数），按本套件定位记录为待修项，**不要为了让用例通过而改断言标准**（已知偏差 sticky/pt-12 除外，那已编码进断言）。

- [ ] **Step 5: Commit**

```bash
git add scorecard/playwright/design/
git commit -m "feat(scorecard): 设计还原 + 响应式维度（DESIGN.md 断言 + 视觉基线）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 代码质量适配器（含前端 ESLint 接入）

**Files:**
- Modify: `frontend/package.json`（devDependencies 加 eslint）
- Create: `frontend/.eslintrc.json`
- Create: `scorecard/adapters/code-quality.mjs`
- Create（运行时生成）: `scorecard/eslint-baseline.json`

**Interfaces:**
- Consumes: run.mjs 以 `node adapters/code-quality.mjs` 调用，期望 stdout 输出 `{dimension:'code_quality', checks:[{id,name,passed,detail}]}`（非法输出 → run.mjs 终止）
- Produces: 检查项 `Q-fe-01`（tsc，否决项）、`Q-fe-02`（ESLint 基线比对）、`Q-fe-03`（console.log 扫描）、`Q-be-01`（mvn compile）

- [ ] **Step 1: 前端接入 ESLint**

`frontend/package.json` 的 `devDependencies` 中追加（保持其余不动）：

```json
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
```

`frontend/.eslintrc.json`：

```json
{
  "extends": "next/core-web-vitals"
}
```

Run: `cd frontend && npm install && npx eslint src --format json | head -c 400`
Expected: 安装成功；eslint 输出 JSON 数组（可能有存量告警——下一步的基线机制会冻结它们）

- [ ] **Step 2: 实现 code-quality.mjs**

`scorecard/adapters/code-quality.mjs`：

```js
#!/usr/bin/env node
// 代码质量适配器：tsc / ESLint 基线比对 / console.log 扫描 / mvn compile
// 输出契约：stdout 打印 {dimension, checks:[{id, name, passed, detail}]}
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.resolve(ROOT, '..');
const FE = path.join(PROJECT, 'frontend');
const BE = path.join(PROJECT, 'backend');
const BASELINE = path.join(ROOT, 'eslint-baseline.json');
const CONSOLE_ALLOWLIST = []; // 允许保留 console.log 的文件（相对 frontend/src 的后缀匹配）

const checks = [];

// Q-fe-01 前端类型检查（否决项）
const tsc = spawnSync('npx', ['tsc', '--noEmit'], { cwd: FE, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
checks.push({
  id: 'Q-fe-01',
  name: '前端类型检查（tsc --noEmit）',
  passed: tsc.status === 0,
  detail: tsc.status === 0 ? '退出码 0' : `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`.slice(0, 800),
});

// Q-fe-02 ESLint：与基线比对，只对新增告警判失败
const lint = spawnSync('npx', ['eslint', 'src', '--format', 'json'], {
  cwd: FE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
let lintResults = null;
try {
  lintResults = JSON.parse(lint.stdout || '[]');
} catch {
  lintResults = null;
}
if (lintResults === null) {
  checks.push({
    id: 'Q-fe-02', name: 'ESLint 检查', passed: false,
    detail: `eslint 输出无法解析：${(lint.stderr ?? '').slice(0, 300)}`,
  });
} else {
  const current = {};
  for (const f of lintResults) {
    const n = f.errorCount + f.warningCount;
    if (n > 0) current[path.relative(FE, f.filePath)] = n;
  }
  const updateBaseline = process.argv.includes('--update-eslint-baseline');
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
  if (updateBaseline || baseline === null) {
    writeFileSync(BASELINE, JSON.stringify(current, null, 2));
    checks.push({
      id: 'Q-fe-02', name: 'ESLint 检查', passed: true,
      detail: `${updateBaseline ? '基线已更新' : '首次运行，基线已创建'}：${Object.keys(current).length} 个文件存在存量告警`,
    });
  } else {
    const newIssues = [];
    for (const [file, count] of Object.entries(current)) {
      if ((baseline[file] ?? 0) < count) newIssues.push(`${file}: ${baseline[file] ?? 0}→${count}`);
    }
    checks.push({
      id: 'Q-fe-02', name: 'ESLint 检查', passed: newIssues.length === 0,
      detail: newIssues.length > 0 ? `新增告警：${newIssues.join('；')}` : '无新增告警',
    });
  }
}

// Q-fe-03 console.log 残留扫描
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next') yield* walk(p);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield p;
    }
  }
}
const hits = [];
for (const f of walk(path.join(FE, 'src'))) {
  if (CONSOLE_ALLOWLIST.some((a) => f.endsWith(a))) continue;
  const src = readFileSync(f, 'utf8');
  const n = (src.match(/console\.log\(/g) ?? []).length;
  if (n > 0) hits.push(`${path.relative(FE, f)}×${n}`);
}
checks.push({
  id: 'Q-fe-03', name: 'console.log 残留扫描', passed: hits.length === 0,
  detail: hits.length > 0 ? hits.join('；') : '无残留',
});

// Q-be-01 后端编译
const mvn = spawnSync('mvn', ['-q', 'clean', 'compile'], { cwd: BE, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
checks.push({
  id: 'Q-be-01', name: '后端编译（mvn clean compile）', passed: mvn.status === 0,
  detail: mvn.status === 0 ? 'BUILD SUCCESS' : `${mvn.stdout ?? ''}${mvn.stderr ?? ''}`.slice(-800),
});

console.log(JSON.stringify({ dimension: 'code_quality', checks }, null, 2));
```

- [ ] **Step 3: 运行适配器验证输出契约**

Run: `cd scorecard && node adapters/code-quality.mjs`
Expected: 输出合法 JSON，含 4 个检查项；首次运行自动生成 `eslint-baseline.json`（Q-fe-02 显示「首次运行，基线已创建」）。若 Q-fe-03 因存量 console.log 失败，把确实合理的文件加入 `CONSOLE_ALLOWLIST`（并在 commit message 里注明），其余的作为待修项记录——不要直接清空扫描逻辑。

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/.eslintrc.json scorecard/adapters/code-quality.mjs scorecard/eslint-baseline.json
git commit -m "feat(scorecard): 代码质量适配器 — tsc/ESLint 基线比对/console.log 扫描/mvn

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 可访问性维度（axe-core）

**Files:**
- Create: `scorecard/playwright/a11y/a11y.spec.ts`

**Interfaces:**
- Consumes: Task 3 的 playwright.config.ts；npm 包 `@axe-core/playwright`（Task 1 已装）
- Produces: `A-page-01..04`，判定规则：critical/serious 违规 → 失败，moderate/minor 只记录

- [ ] **Step 1: a11y.spec.ts**

`scorecard/playwright/a11y/a11y.spec.ts`：

```ts
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
```

- [ ] **Step 2: 运行 a11y 用例**

Run: `cd scorecard/playwright && npx playwright test a11y/`
Expected: 全部通过。若某页暴露 critical/serious 违规（常见：图片缺 alt、对比度不足），修复前端对应问题后重跑直至通过——这类修复属于本任务范围（a11y 缺陷就是缺陷）；修复代码与用例一起提交。

- [ ] **Step 3: Commit**

```bash
git add scorecard/playwright/a11y/ frontend/src/
git commit -m "feat(scorecard): 可访问性维度 — axe-core 扫描 4 个公共页

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 性能适配器（Lighthouse）

**Files:**
- Create: `scorecard/adapters/perf.mjs`

**Interfaces:**
- Consumes: run.mjs 以 `node adapters/perf.mjs` 调用（仅巡检模式）；npm 包 `lighthouse` + `chrome-launcher`（Task 1 已装）；宿主机装有 Chrome
- Produces: 检查项 `P-home-01`、`P-blog-01`、`P-detail-01`，每项带 `score: min(100, lh分/90*100)`、`passed: lh分 >= 90`（run.mjs 侧 dimensionScore 对全数字 score 取平均 → 线性计分）

- [ ] **Step 1: 实现 perf.mjs**

注意：Node 不能 import TypeScript（`support/api.ts` 不可复用），地址常量在本文件内联定义。

`scorecard/adapters/perf.mjs`：

```js
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
```

- [ ] **Step 2: 运行适配器验证**

Run: `cd scorecard && node adapters/perf.mjs`
Expected: 约 1-3 分钟后输出合法 JSON，3 个检查项各带 `detail: Lighthouse performance <分数>`。若单页 <90 属真实性能问题，记录为待优化项（不在本任务修）。

- [ ] **Step 3: Commit**

```bash
git add scorecard/adapters/perf.mjs
git commit -m "feat(scorecard): 性能适配器 — Lighthouse 3 页（>=90 满分线性计分）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 项目 Skill + CLAUDE.md + 首次全站巡检定基线

**Files:**
- Create: `.claude/skills/acceptance-scorecard/SKILL.md`
- Modify: `CLAUDE.md`（常用命令区追加评分卡命令）
- Create（运行生成）: `scorecard/reports/<stamp>-patrol.md`、`scores/history.csv` 新行

**Interfaces:**
- Consumes: Task 1-8 全部产物
- Produces: AI 可自主调用的验收闭环；首次巡检基线分数

- [ ] **Step 1: 写项目 Skill**

`.claude/skills/acceptance-scorecard/SKILL.md`：

```markdown
---
name: acceptance-scorecard
description: Sean-Blog 验收评分卡。完成一个功能的实现后自主验收，或用户要求「验收 / 跑评分卡 / 巡检 / 全站检查」时使用。运行四维评分（功能/设计/代码质量/可访问性+性能），按失败清单修复并重跑直到通过。
---

# 验收评分卡

评分卡定义在 `scorecard/scorecard.yaml`（唯一事实源），设计文档见
`docs/superpowers/specs/2026-08-04-acceptance-scorecard-design.md`。

## 何时使用
- 完成一个功能的实现后（交付用户前必须先过验收）
- 用户说「验收」「跑评分卡」「巡检」「全站检查」时

## 流程
1. **判断模式**：单功能 → feature 验收；整站 → patrol 巡检。
2. **登记功能**（仅 feature 模式）：在 `scorecard/scorecard.yaml` 的 `features:`
   追加 `{id, desc, min_tests}`；为该功能写的用例标题打 `@feature:<id>` 标签，
   并带稳定 ID 前缀（F/D/A/Q/P）与维度标签。
3. **运行**（改过业务代码必须加 `--rebuild`，确保 docker 容器是最新构建）：
   ```bash
   cd scorecard && npm run check:feature -- --feature=<id> --rebuild
   cd scorecard && npm run check:all          # 巡检
   ```
4. **读结果**：看控制台输出与 `scorecard/reports/` 下最新报告。
5. **未通过**：按失败清单逐项修复 → 重跑。最多 3 轮；仍未通过则带着最新报告
   找用户说明卡点，不得隐瞒失败。
6. **通过**：`git add scorecard/reports scores/history.csv` 一并提交。

## 环境要点
- 一律以 docker compose 栈为验收对象（frontend:3000 / backend:8880）；
  本机 3000 端口可能被旧容器/旧进程占用，`--rebuild` 可消除歧义
- 新增评分卡依赖：`cd scorecard && npm install`
- 视觉基线：首次生成或视觉变化是有意的时候，在 scorecard/playwright 下
  `npx playwright test design/ --update-snapshots`

## 测试数据安全
- 写入类测试只允许创建文章/项目，标题必须以 `[scorecard-test]` 开头，
  用例自带 teardown 删除；run.mjs 开场会清扫任何残留
- 访问日志、简历请求记录等不可删除数据严格只读

## 评分规则速查
- 权重：功能 0.40 / 设计 0.25 / 代码质量 0.20 / 可访问性+性能 0.15
- 通过：总分 ≥ 80 且 core_checks（F-home-01/F-blog-01/F-detail-01/F-admin-01/Q-fe-01）全过
```

- [ ] **Step 2: CLAUDE.md 追加命令**

在 `CLAUDE.md` 的「常用命令」代码块末尾追加：

```bash
# 验收评分卡（详见 docs/superpowers/specs/2026-08-04-acceptance-scorecard-design.md）
cd scorecard && npm run check:all                       # 全站巡检
cd scorecard && npm run check:feature -- --feature=<id> # 单功能验收（改过代码加 --rebuild）
```

- [ ] **Step 3: 首次全站巡检，定基线**

前置：docker compose 栈为最新构建（`docker compose build && docker compose up -d` 或 run.mjs `--rebuild`）。

Run: `cd scorecard && npm run check:feature -- --feature=nonexistent; echo exit=$?`
Expected: feature 过滤生效——Playwright 只跑 @core 用例（grep `@feature:nonexistent|@core`），报告只含 functional + code_quality 两个激活维度；因 `features:` 为空数组，不会有用例不足报错；总分未达 80 或否决项未全覆盖时 `exit=1`。这是冒烟验证过滤逻辑，产物不提交（`git checkout -- scorecard/reports scores/history.csv` 或运行前记住勿 add）。

Run: `cd scorecard && npm run check:all`
Expected: 完整四维巡检，生成 `scorecard/reports/*-patrol.md` 并在 `scores/history.csv` 追加一行。逐项核对报告与四个维度的实际状态一致。若总分 <80：这是真实基线，把失败项如实记录在 commit message 里，**不得为凑分改断言**；若存在否决项失败（如 F-admin-01 登录流程选择器问题），修复后重跑。

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/acceptance-scorecard/ CLAUDE.md scorecard/reports/ scores/history.csv
git commit -m "feat(scorecard): 项目 Skill + 首次全站巡检基线

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: 收尾自检清单**

逐项确认后，本计划完成：
- `cd scorecard && npm test` → 13 项单测全过
- `cd scorecard && npm run check:all` → 产出报告与 history.csv 行，退出码与通过状态一致
- `scores/history.csv` 至少 2 行（Task 2 冒烟 + 本次巡检）
- `.claude/skills/acceptance-scorecard/SKILL.md` 存在且被 Claude Code 识别（新会话中可见）
- worktree 内所有任务已提交，准备按 finishing-a-development-branch 流程合并回 master
