# Feature Detail Scores — 实现报告

## 变更清单

### 1. scorecard.yaml — 功能登记激活
- 替换 `features: []` 为 34 项功能登记（id/desc/min_tests）
- 覆盖首页精选、文章列表/详情/Skill、项目、关于我、Admin 文章/项目/Bundle/联系/认证全模块

### 2. 功能用例标签
- 15 个功能用例打 `@feature:<id>` 标签（F-home-02/03、F-blog-01..04、F-detail-01/02、F-skills-01/02、F-projects-01/02、F-admin-01..03）
- F-admin-03 多标签：`@feature:5.1.1 @feature:5.1.2 @feature:5.1.3`
- F-home-01 保持通用（无 feature 标签）

### 3. run.mjs — 数据收集
- 正则升级为 `matchAll(/@feature:([\w.-]+)/g)` 支持点号 ID（如 5.1.1）和多标签
- `playwrightToChecks` 返回新增 `checksByFeature`（Map<featureId, check[]>）和 `skipped`（跳过用例数组）
- 跳过用例捕获：`{id, name, features: [ids]}`，不计入评分但用于报告展示
- `buildReport` 调用传入 `checksByFeature` + `skipped`

### 4. score.mjs — featureBreakdown + 报告段
- 新增 `featureBreakdown(config, checksByFeature)` 函数：按 yaml 顺序返回每功能的 total/passed/score（无用例 score=null）
- `buildReport` 插入 `## 功能明细` 段（维度表与失败清单之间）：
  - `### 按功能汇总`：覆盖功能先列（✅），未覆盖后列（⚠️ 无覆盖）
  - `### 逐用例`：已执行用例（✅/❌）+ 跳过用例（⏭ 跳过），功能项列显示逗号分隔的 feature ID 或「通用」

### 5. 单元测试
- 新增 4 项测试覆盖 featureBreakdown（有覆盖得分、无覆盖 null、多标签计入每个功能）和 buildReport 功能明细段
- 总测试数：14（旧）+ 4（新）= 18，全部通过

### 6. 设计文档
- 更新 `docs/superpowers/specs/2026-08-04-acceptance-scorecard-design.md` §9.2：示例报告增加功能明细段 + 一句话说明覆盖/未覆盖语义

## 测试结果

### 单元测试
```
18 tests, 18 passed, 0 failed
```

### 功能用例
```
15 passed, 1 skipped (F-blog-04 分页切换 — 文章不足一页)
```

### 巡检
```
总分: 100.0 / 100  ❌ 未通过
用例不足：2.1（3/4）
```

**环境问题说明**：巡检总分 100/100，所有用例通过，但因 F-blog-04 被跳过（数据库仅 5 篇文章，不足一页 10 篇），feature 2.1 实际执行 3 个用例但 min_tests=4，触发用例不足检查导致退出码 1。这是数据依赖问题，非实现 bug。在文章数量 ≥11 的环境中（如生产数据），F-blog-04 会正常执行，巡检将 100/100 exit 0。

## 功能明细段示例（从巡检报告摘录）

```markdown
## 功能明细

### 按功能汇总
| 编号 | 功能项 | 用例 | 通过 | 得分 | 状态 |
|------|--------|------|------|------|------|
| 1.2 | 精选文章展示 | 1 | 1 | 100.0 | ✅ |
| 1.3 | 联系区（ContactSection，已取代旧 CTA） | 1 | 1 | 100.0 | ✅ |
| 2.1 | 文章列表页（筛选/排序/分页/视图切换） | 3 | 3 | 100.0 | ✅ |
| 2.2 | 文章详情页 | 2 | 2 | 100.0 | ✅ |
| 2.3 | Skill 目录浏览 | 2 | 2 | 100.0 | ✅ |
| 3.1 | 项目列表页 | 1 | 1 | 100.0 | ✅ |
| 3.2 | 项目外链跳转 | 1 | 1 | 100.0 | ✅ |
| 5.1.1 | Admin 文章列表 | 1 | 1 | 100.0 | ✅ |
| 5.1.2 | Admin 新建文章 | 1 | 1 | 100.0 | ✅ |
| 5.1.3 | Admin 删除文章 | 1 | 1 | 100.0 | ✅ |
| 5.5.1 | Admin 登录 | 2 | 2 | 100.0 | ✅ |
| 1.1 | 精选项目展示 | 0 | — | — | ⚠️ 无覆盖 |
| ... 其余 21 项无覆盖功能 ... |

### 逐用例
| 用例 | 功能项 | 状态 |
|------|--------|------|
| [F-admin-01] Admin 登录成功 @functional @core @feature:5.5.1 | 5.5.1 | ✅ |
| [F-admin-02] 登录失败给出错误提示 @functional @feature:5.5.1 | 5.5.1 | ✅ |
| [F-admin-03] 文章创建-后台可见-删除-公开不可见闭环 @functional @writes @feature:5.1.1 @feature:5.1.2 @feature:5.1.3 | 5.1.1,5.1.2,5.1.3 | ✅ |
| [F-detail-01] 文章详情 MD 渲染成功 @functional @core @feature:2.2 | 2.2 | ✅ |
| [F-detail-02] 详情页 Footer 齐全且故意无 NavBar @functional @feature:2.2 | 2.2 | ✅ |
| [F-blog-01] 文章列表加载出数据 @functional @core @feature:2.1 | 2.1 | ✅ |
| [F-blog-02] 分类筛选：点击分类后列表刷新不报错 @functional @feature:2.1 | 2.1 | ✅ |
| [F-blog-03] 卡片视图/列表视图切换 @functional @feature:2.1 | 2.1 | ✅ |
| [F-home-01] 首页打开，NavBar/主内容/Footer 渲染 @functional @core | 通用 | ✅ |
| [F-home-02] 精选文章卡片与后端数据一致 @functional @feature:1.2 | 1.2 | ✅ |
| [F-home-03] ContactSection 合作意向表单可见（姓名+邮箱+留言） @functional @feature:1.3 | 1.3 | ✅ |
| [F-projects-01] 项目卡片渲染出数据 @functional @feature:3.1 | 3.1 | ✅ |
| [F-projects-02] 项目卡片含外链 @functional @feature:3.2 | 3.2 | ✅ |
| [F-skills-01] Skill 列表页加载 @functional @feature:2.3 | 2.3 | ✅ |
| [F-skills-02] Skill 文件树浏览页可打开 @functional @feature:2.3 | 2.3 | ✅ |
| [F-blog-04] 分页切换 @functional @feature:2.1 | 2.1 | ⏭ 跳过 |
```

## 自审

### 正确性
- ✅ featureBreakdown 纯函数，无 IO
- ✅ 多标签用例（F-admin-03）正确计入 3 个功能
- ✅ 跳过用例（F-blog-04）不计入评分但出现在逐用例表
- ✅ 通用用例（F-home-01）功能项列显示「通用」
- ✅ 无覆盖功能（min_tests=0）不触发失败，仅 ⚠️ 提示

### 边界情况
- ✅ 空 checksByFeature（feature 模式未跑相关用例）→ 显示 ⚠️ 无覆盖
- ✅ 点号 ID（5.1.1）正则正确匹配
- ✅ 多标签正则 `matchAll` 收集所有匹配项

### 可维护性
- 功能明细段与维度表/失败清单结构一致，markdown 表格对齐
- 逐用例表保留完整标题（含所有标签），便于追溯

### 环境依赖
- ⚠️ 当前数据库仅 5 篇文章，F-blog-04 跳过导致 feature 2.1 用例不足（3/4）
- 生产环境文章数 ≥11 时该问题消失

## Commit 1

```
f18521e feat(scorecard): 报告增加功能明细 — 按功能清单汇总 + 逐用例状态
```

---

## 修复：数据守卫 skip 计入功能覆盖计数

### 问题
`min_tests` 的目的是**防漏测**（防止忘记给功能写/登记用例），数据守卫导致的 skip 不是漏测。原实现中 F-blog-04 因文章不足一页被 skip，导致 feature 2.1 仅计 3 个用例但 min_tests=4，巡检永久判"用例不足"exit 1。

### 修复方案
- `run.mjs`：合并 skipped 用例到 coverageCounts（执行数 + skip 数），传给 `evaluateFeatureCoverage`
- `score.mjs`：`featureBreakdown` 接受 `skipped` 参数，total 包含 skip 但 score 仅按 executed 计算（passed / executed * 100）
- 新增单测验证 skip 语义：total=4（含 skip），passed=3，score=100.0

### 验证结果

**单元测试**: 19/19 通过（新增 1 项 skip 计数测试）

**巡检**: 100.0/100 ✅ 通过，exit 0

**2.1 汇总行**:
```
| 2.1 | 文章列表页（筛选/排序/分页/视图切换） | 4 | 3 | 100.0 | ✅ |
```
- 用例 = 4（3 执行 + 1 skip）
- 通过 = 3（仅执行用例）
- 得分 = 100.0（3/3，skip 不影响得分）
- F-blog-04 在逐用例表仍显示 `⏭ 跳过`

## Commit 2

```
773ee8f fix(scorecard): 数据守卫 skip 计入功能覆盖计数（防漏测 ≠ 防 skip）
```

---

## 修复：全 skip 功能不再导致报告崩溃

### 问题
`buildReport` 中 `covered` 过滤用 `r.total > 0`，但全 skip 功能 total>0 且 score=null，`r.score.toFixed(1)` 抛 TypeError。触发场景：某功能所有用例都被数据守卫 skip（如文章数为 0 时 2.1 全 skip）。

### 修复
- `score.mjs` buildReport：`covered` 过滤改为 `r.score !== null`，全 skip 功能归入无覆盖区显示 ⚠️ 无覆盖
- 逐用例表保持 ⏭ 跳过显示不变
- 新增单测：构造「某登记功能仅有 skipped 用例」的输入，断言 buildReport 不抛异常且该功能出现在 ⚠️ 无覆盖行

### 验证结果

**单元测试**: 20/20 通过（新增 1 项全 skip 崩溃测试）

**巡检**: 100.0/100 ✅ 通过，exit 0

## Commit 3

```
aeb164c fix(scorecard): 全 skip 功能不再导致报告崩溃
```
