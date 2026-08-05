# Release Notes: Vibe Coding 验收评分卡

**日期：** 2026-08-05
**分支：** `master`
**状态：** ✅ 已合入（基线 100/100）
**关联设计：** [2026-08-04-acceptance-scorecard-design.md](../superpowers/specs/2026-08-04-acceptance-scorecard-design.md)
**关联计划：** [2026-08-04-acceptance-scorecard.md](../superpowers/plans/2026-08-04-acceptance-scorecard.md)

---

## 需求说明

> 为 Sean-Blog 建立一套可复现、可量化、AI 能自主执行的验收机制（"Vibe Coding 评分卡"）：把「什么叫做完、什么叫做对」变成机器可执行的契约，替代过去每次对话随手写一次性 CDP 脚本的 ad-hoc 验收。

### 核心功能

1. **四维加权评分** — 功能完成度 40% / 设计还原+响应式 25% / 代码质量 20% / 可访问性+性能 15%，总分 ≥ 80 通过
2. **核心项一票否决** — 首页/博客列表/文章详情/Admin 登录/前端类型检查，任一失败整次不通过
3. **功能明细评分** — 按《功能清单》33 个功能项输出「按功能汇总 + 逐用例」两层明细，无覆盖项显式标 ⚠️
4. **双运行模式** — `check:feature`（单功能验收，权重归一）与 `check:all`（全站巡检）
5. **完整测试套件** — Playwright 37 个 E2E 用例 + 2 个适配器（代码质量/Lighthouse）+ 20 项计分单测
6. **项目 Skill** — `/acceptance-scorecard`：AI 完成功能后自主验收、按失败清单修复、最多 3 轮后带报告上报
7. **质量趋势追踪** — Markdown 报告 + `scores/history.csv` 均进 git

### 决策：架构方案

**选择「scorecard.yaml 唯一事实源 + 维度适配器」架构。** yaml 定义「查什么」（维度/权重/否决项/功能登记），Playwright 用例与适配器实现「怎么查」，`score.mjs` 纯函数输出「多少分」。三层职责分离，新增维度（如 SEO）只需加适配器并登记。对比过的替代方案：Playwright 包办一切（职责混乱难扩展）、无统一计分层（无法满足加权总分），均否。

---

## 思考过程

- **决策 1：完整测试套件而非纯文档评分卡** — 四个维度全部落成可执行用例/适配器，分数可复现不依赖 AI 当次自觉 — trade-off：建设成本高（29 个提交），换来分数可信与 CI 就绪

- **决策 2：docker compose 全栈为验收环境** — 对生产同构环境（frontend:3000 + backend:8880）验收，验构建产物而非 dev 热更新 — trade-off：每次改动需 rebuild，消除「3000 端口挂着旧前端」的历史歧义

- **决策 3：写入类测试限可删除实体 + 三重安全** — 仅文章/项目可写入，标题强制 `[scorecard-test]` 前缀、用例 teardown、run.mjs 开场清扫 — trade-off：放弃了对不可删除数据（访问日志等）的写入测试，换取真实博客数据零污染风险

- **决策 4：ESLint 存量基线豁免** — 首次运行冻结 13 个存量 `<img>` 告警，之后只对新增告警判失败 — trade-off：存量问题暂不修复，但保证新代码零告警且不阻塞评分卡落地

- **决策 5：skip 计入覆盖但不计分** — 数据守卫跳过的用例计入功能覆盖计数（min_tests 防漏测 ≠ 防 skip），但不进得分分母 — trade-off：语义稍复杂（需单测锁定），避免数据库只有 5 篇文章时巡检永久失败

- **决策 6：截图基线 gitignore** — 视觉基线本地生成（`--update-snapshots`），不进 git — trade-off：换机器需重新生成基线，避免二进制文件膨胀仓库

### 关键 trade-off

| 决策 | 分类 | 理由 |
|------|------|------|
| yaml 事实源 + 适配器 vs Playwright 包办 | 可维护性 | 三层分离可扩展；包办方案职责混乱 |
| 完整套件 vs 纯文档评分卡 | 可信度 | 分数可复现；文档式依赖 AI 自觉 |
| compose 全栈 vs 本地 dev | 真实性 | 验生产同构环境，消除端口歧义 |
| 基线豁免 vs 全量修复 lint | 落地速度 | 新代码零告警即可，存量后续迁移 next/image |
| skip 计入覆盖 vs 计入失败 | 语义正确性 | 防漏测不应被数据量惩罚 |

---

## 实现过程

### 任务分解（Subagent 驱动：9 任务 × 实现+审查双 subagent，worktree 隔离）

| # | 任务 | 产出 |
|---|------|------|
| 1 | 脚手架 + 计分核心 | score.mjs 纯函数 + 14→20 项单测（TDD） |
| 2 | run.mjs 编排 | 环境体检/数据清扫/双模式/报告/history.csv |
| 3 | 公共页功能用例 | 5 页面 13 用例 |
| 4 | Admin 功能用例 | 登录 + 文章 CRUD 闭环（含三重安全） |
| 5 | 设计还原 + 响应式 | DESIGN.md 断言 + 375px 无溢出 + 5 张视觉基线 |
| 6 | 代码质量适配器 | tsc / ESLint 基线比对 / console.log 扫描 / mvn |
| 7 | 可访问性维度 | axe-core 4 页，critical/serious 即失败 |
| 8 | 性能适配器 | Lighthouse 3 页（≥90 满分线性计分） |
| 9 | Skill + 基线 | /acceptance-scorecard + CLAUDE.md + 首次 100/100 |
| + | 功能明细扩展 | 33 项功能登记 + @feature 标签 + 两层明细报告 |

### 建设过程中抓到的真实问题（评分卡还没上线就先立功）

1. **文章详情页缺 NavBar** → 产品决策：本来就不需要（沉浸式阅读），用例以 `toHaveCount(0)` 固化
2. **CTASection 废弃未清理** → 首页/关于页统一 ContactSection，删除 CTA/简历/邮件三个孤立组件
3. **11 处可访问性缺陷** → 低透明度文字对比度不达标（8 组件）、关于页 9 个图标缺 aria-label
4. **间歇性对比度失败** → 横幅 NEW 徽章脉冲动画 GPU 合成色偏，移除脉冲并支持 prefers-reduced-motion
5. **AnnouncementBanner 构建阻断** → 未转义撇号 ESLint 报错
6. **计划自身 3 个缺陷** → skipped 误计失败、Playwright 目录缺失处理、清扫 DELETE 不校验状态（审查阶段全部抓出）
7. **worktree docker 网络分裂** → worktree 重建 frontend 进独立网络解析不到 backend，已固化为 Skill 警告与 memory

---

## 指标

### 代码量

| 项 | 数量 |
|----|------|
| scorecard/ 代码行（mjs/ts/yaml） | ~1,400 |
| 提交数（本轮） | 29 |
| 改动文件 | 52 |

### 测试分布

| 维度 | 用例数 |
|------|--------|
| 功能完成度（含 Admin CRUD 闭环） | 16 |
| 设计还原 + 响应式 + 视觉基线 | 17 |
| 可访问性（axe-core） | 4 |
| 计分逻辑单测（node:test） | 20 |

### 质量基线

- 首次全站巡检：**100.0 / 100**（四维全满），exit 0
- Lighthouse：首页 99 / 博客列表 100 / 文章详情 100
- 功能覆盖：33 项登记，11 项有用例覆盖，22 项显式 ⚠️ 无覆盖

### 用时与协作

- 两个工作日（2026-08-04 ~ 08-05），Subagent 驱动：约 20 次实现/审查派发（每任务实现者 + 审查者，关键任务多轮修复），终审由 opus 全分支审查

---

## 决策审计追踪

| 决策 | 拍板人 | 时点 |
|------|--------|------|
| 详情页故意无 NavBar（修正 spec 而非修"缺陷"） | 用户 | Task 3 审查时 |
| ContactSection 取代 CTA，废弃组件删除 | 用户 | Task 3 审查时 |
| 关于页也不保留 CTA | 用户 | Task 3 修复时 |
| 在 worktree 中实施 | 用户 | 执行前 |
| Subagent 驱动执行 | 用户 | 执行前 |
| 功能明细两层呈现 + 按功能清单细粒度 | 用户 | 明细扩展时 |
| skip 计入覆盖不计分 | 控制层裁定 | 明细扩展审查时 |

---

## 已知限制

- **22 项功能无 E2E 覆盖**：集中在 Admin CRUD（项目/分类/标签/Bundle）、关于我页、Token 过期处理；其中 **1.1 首页精选项目展示** 属于应有而缺失的用例
- **ESLint 基线冻结** 13 个 `@next/next/no-img-element` 存量告警
- **截图基线仅本地**：换机器/重建需 `--update-snapshots` 重新生成
- **Admin 凭据硬编码**在 scorecard 代码中（admin/admin123，仅本地 dev 环境默认值）
- **history.csv 只记录总分/维度分**，功能级明细无趋势追踪
- 评分卡面向本地 dev 栈，未接 CI

## 后续事项

1. 补 1.1 首页精选项目用例（优先级最高：覆盖缺口中的唯一"应有"项）
2. 按需为 Admin CRUD 功能补用例并把对应 `min_tests` 调大锁定
3. next/image 迁移消化 ESLint 基线存量
4. 考虑 `npm run summary` 快捷命令 / 功能明细趋势 CSV
5. push 后可评估接入 GitHub Actions（E2E 需要 compose 全栈环境）
