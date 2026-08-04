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
