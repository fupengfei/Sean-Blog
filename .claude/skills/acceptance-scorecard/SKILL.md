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

## Worktree 特别注意
- 在 git worktree 里重建 frontend 容器（docker compose build/up）后，容器会进 worktree
  自己的网络，解析不到 backend → 数据页全变错误状态。必须补：
  `docker network connect sean-blog_default sean-blog-frontend`
- 诊断特征：页面出现红色错误卡片但 `curl http://localhost:8880/api/v1/categories` 正常

## 测试数据安全
- 写入类测试只允许创建文章/项目，标题必须以 `[scorecard-test]` 开头，
  用例自带 teardown 删除；run.mjs 开场会清扫任何残留
- 访问日志、简历请求记录等不可删除数据严格只读

## 评分规则速查
- 权重：功能 0.40 / 设计 0.25 / 代码质量 0.20 / 可访问性+性能 0.15
- 通过：总分 ≥ 80 且 core_checks（F-home-01/F-blog-01/F-detail-01/F-admin-01/Q-fe-01）全过
