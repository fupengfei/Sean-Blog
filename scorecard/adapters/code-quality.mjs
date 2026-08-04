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
const CONSOLE_ALLOWLIST = [
  // WeChat JS SDK 回调日志，带 [WeChatSDK] 前缀，用于分享调试，保留合理
  'src/components/blog/WeChatSDK.tsx',
]; // 允许保留 console.log 的文件（相对 frontend/src 的后缀匹配）

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
