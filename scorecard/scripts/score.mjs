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
  return (passed * 100) / checks.length;
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
  // Round weightSum to avoid IEEE 754 accumulation noise (e.g. 0.4+0.2 → 0.6000000000000001)
  const ws = Math.round(weightSum * 1e10) / 1e10;
  const total = ws > 0 ? weighted / ws : 0;
  return { scores, total, warnings };
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

/** 功能明细：每个登记功能的用例数/通过数/得分；无用例 → score null（无覆盖）。 */
export function featureBreakdown(config, checksByFeature) {
  const rows = [];
  for (const f of config.features ?? []) {
    const checks = checksByFeature.get(f.id) ?? [];
    const total = checks.length;
    const passed = checks.filter((c) => c.passed).length;
    const score = total > 0 ? Math.round((passed * 1000) / total) / 10 : null;
    rows.push({ id: f.id, desc: f.desc, min_tests: f.min_tests, total, passed, score });
  }
  return rows;
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

export function buildReport({ config, mode, timestamp, scores, total, veto, featureFailures, allChecks, warnings, checksByFeature, skipped }) {
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
  // 功能明细：按功能汇总 + 逐用例
  if (checksByFeature) {
    const breakdown = featureBreakdown(config, checksByFeature);
    const covered = breakdown.filter((r) => r.total > 0);
    const uncovered = breakdown.filter((r) => r.total === 0);
    lines.push('');
    lines.push('## 功能明细');
    lines.push('');
    lines.push('### 按功能汇总');
    lines.push('| 编号 | 功能项 | 用例 | 通过 | 得分 | 状态 |');
    lines.push('|------|--------|------|------|------|------|');
    for (const r of covered) {
      lines.push(`| ${r.id} | ${r.desc} | ${r.total} | ${r.passed} | ${r.score.toFixed(1)} | ✅ |`);
    }
    for (const r of uncovered) {
      lines.push(`| ${r.id} | ${r.desc} | 0 | — | — | ⚠️ 无覆盖 |`);
    }
    // 逐用例：已执行 + 跳过
    lines.push('');
    lines.push('### 逐用例');
    lines.push('| 用例 | 功能项 | 状态 |');
    lines.push('|------|--------|------|');
    for (const c of allChecks) {
      const featureIds = [...c.name.matchAll(/@feature:([\w.-]+)/g)].map((m) => m[1]);
      const featureCol = featureIds.length > 0 ? featureIds.join(',') : '通用';
      const statusCol = c.passed ? '✅' : '❌';
      lines.push(`| ${c.name} | ${featureCol} | ${statusCol} |`);
    }
    for (const s of skipped ?? []) {
      const featureCol = s.features.length > 0 ? s.features.join(',') : '通用';
      lines.push(`| ${s.name} | ${featureCol} | ⏭ 跳过 |`);
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
