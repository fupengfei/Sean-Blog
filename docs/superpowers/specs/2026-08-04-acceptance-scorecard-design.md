# Vibe Coding 验收评分卡 — 设计文档

> 日期：2026-08-04 | 状态：设计阶段

## 1. 背景

当前项目的验收完全依赖 ad-hoc 手段：每次做完功能后随手写一次性 CDP 脚本截图、断言，脚本放在 `/tmp` 会话间不保留，验收标准存在于对话上下文里，不可复现、不可追踪。前端 `package.json` 中没有任何测试框架，全站质量没有量化指标。

**缺失能力**：

1. 没有一份「什么叫做完、什么叫做对」的可机器执行契约
2. 没有全站质量的量化基线，无法追踪每次发版后的质量变化
3. AI 完成功能后无法自主验收，只能等人来看

## 2. 目标

建立一套**验收评分卡**体系：

1. **单功能验收模式**：每个功能完成后，AI 按评分卡逐项验收，给出分数和问题清单，未通过则自行修复重跑
2. **全站巡检模式**：定期（发版前/周期性）对全站所有页面跑完整评分，产出质量报告，历史分数进 git 追踪趋势
3. 四个评分维度一步到位：**功能完成度、设计还原+响应式、代码质量、可访问性+性能**

## 3. 已确认的关键决策

| 决策点 | 结论 |
|--------|------|
| 使用场景 | 单功能验收 + 全站巡检，同一套评分卡两种模式 |
| 自动化程度 | 完整测试套件（Playwright 正式用例，非一次性脚本） |
| 评分维度 | 功能 40% / 设计还原+响应式 25% / 代码质量 20% / 可访问性+性能 15% |
| 计分规则 | 加权总分 ≥ 80 且核心项无一失败（一票否决）才算通过 |
| 触发方式 | npm scripts + 项目 Skill（AI 做完功能后自主调用） |
| 验收环境 | docker compose 全栈（frontend:3000 + backend:8880 + MySQL + Redis；本地 compose 无 Nginx），与生产同构 |
| 报告 | Markdown 报告 + `scores/history.csv`，均提交进 git |
| 数据写入 | 只读优先；对有删除功能的实体（文章、项目）允许写入测试，须遵守第 6.4 节安全规则 |

## 4. 总体架构

**方案选型**：评分卡配置文件为「大脑」+ 各维度独立适配器（对比过 Playwright 包办一切、无统一计分层两个替代方案，前者职责混乱难扩展，后者无法满足加权总分需求，均否）。

```
scorecard.yaml（唯一事实源：维度/权重/否决项/功能登记）
        │
        ├─→ Playwright 套件 ──┬─ @functional 功能完成度
        │                     ├─ @design     设计还原+响应式（DOM 断言+截图基线）
        │                     └─ @a11y       可访问性（axe-core）
        ├─→ adapters/code-quality.mjs ── tsc/eslint/mvn → JSON
        └─→ adapters/perf.mjs ── Lighthouse → JSON
        ↓
scripts/score.mjs 聚合 → 加权总分 + 否决判定
        ↓
Markdown 报告 + scores/history.csv（进 git）
```

三层职责分离：**yaml 定义「查什么」，用例/适配器实现「怎么查」，score.mjs 输出「多少分」**。未来新增维度（如 SEO）只需加一个适配器并在 yaml 登记。

## 5. 目录结构

全部放在新的顶层 `scorecard/` 目录，不污染 `frontend/` 与 `backend/`：

```
scorecard/
├── package.json                # devDeps: playwright / @axe-core/playwright / lighthouse
├── scorecard.yaml              # 评分卡定义（唯一事实源）
├── playwright/
│   ├── playwright.config.ts    # baseURL=http://localhost:3000（frontend 容器）
│   ├── functional/*.spec.ts    # 按页面分文件：home / blog / blog-detail / skills / projects / admin
│   ├── design/*.spec.ts        # design-system.spec.ts + responsive.spec.ts
│   ├── a11y/a11y.spec.ts
│   └── screenshots/            # 视觉回归基线（gitignore，首次运行生成）
├── adapters/
│   ├── code-quality.mjs        # 输出统一 JSON
│   └── perf.mjs                # 输出统一 JSON
├── scripts/
│   ├── run.mjs                 # 编排：环境体检 → 清扫测试数据 → 跑各适配器 → 调 score.mjs
│   └── score.mjs               # 计分 + 报告生成
└── reports/                    # 生成的 Markdown 报告（进 git）
scores/history.csv              # 历史分数（进 git）
.claude/skills/acceptance-scorecard/SKILL.md   # 项目 Skill
```

## 6. scorecard.yaml Schema 与用例契约

### 6.1 Schema

```yaml
version: 1
pass_threshold: 80

dimensions:
  functional:    { weight: 0.40, runner: playwright, tag: "@functional" }
  design:        { weight: 0.25, runner: playwright, tag: "@design" }
  code_quality:  { weight: 0.20, runner: adapters/code-quality.mjs }
  a11y_perf:     { weight: 0.15, sub_weights: { a11y: 0.5, perf: 0.5 } }

core_checks:          # 一票否决项：任一失败 → 整次验收不通过，与总分无关
  - F-home-01         # 首页可打开且核心区块渲染
  - F-blog-01         # 文章列表加载出数据
  - F-detail-01       # 文章详情 MD 渲染成功
  - F-admin-01        # Admin 登录成功
  - Q-fe-01           # tsc --noEmit 零错误

features:             # 功能登记：验收模式按此过滤，防静默漏测
  - id: wechat-share  # 执行用例数 < min_tests 即判失败（不只是 0）
    desc: 微信分享
    min_tests: 3

# 已知合理偏差（断言以实现约定为准，不照抄设计稿）：
# - NavBar 为 sticky（h-20 占文档流），设计稿为 fixed；页面顶部留白 pt-12 而非设计稿 pt-32
```

### 6.2 用例命名契约

Playwright 用例标题必须带**稳定 ID 前缀**并打维度标签：

```ts
test('[F-home-01] 首页打开，Hero/精选项目/精选文章区块渲染 @functional @core', ...)
test('[D-layout-03] 文章列内容区最大宽度 720px @design', ...)
test('[A-blog-01] 博客列表页 axe 扫描无 critical/serious 违规 @a11y', ...)
```

- ID 前缀归属维度：`F`=功能、`D`=设计、`A`=可访问性、`Q`=代码质量、`P`=性能
- score.mjs 解析用例 ID 前缀归入维度
- 否决项判定**以 yaml `core_checks` 为准**；标题里的 `@core` 标签只是辅助可读性标记，score.mjs 不依赖它（避免标签与配置漂移）
- 功能验收用例额外打 `@feature:<id>` 标签（id 须在 yaml features 中登记）

### 6.3 适配器输出 JSON 契约

`code-quality.mjs` 与 `perf.mjs` 必须输出：

```json
{
  "dimension": "code_quality",
  "checks": [
    { "id": "Q-fe-01", "name": "前端类型检查", "passed": true, "detail": "tsc --noEmit 退出码 0" }
  ]
}
```

score.mjs 对格式做校验，不合法即终止（见第 9 节）。

### 6.4 写入类测试的安全规则

只读优先，但允许对**有删除功能的实体**（文章、项目）走完整 CRUD 闭环（Admin 创建 → 前台可见 → 删除 → 前台消失）。三条强制规则：

1. **命名标记**：测试创建的实体标题一律带固定前缀 `[scorecard-test]`
2. **结束清理**：写入类用例自带 teardown，结束时删除自己创建的实体；文章软删（status=DELETED）后前台不可见即视为清理成功
3. **开场清扫**：run.mjs 每次运行前经 Admin API 扫一遍，删除任何残留的 `[scorecard-test]` 前缀实体——上次运行中途崩溃留下的脏数据下次运行自愈

不可删除的数据（访问日志、简历请求记录等）严格只读。

## 7. 四个维度的实现

### 7.1 功能完成度（`playwright/functional/`，权重 40%）

对 docker compose 全栈的真实数据运行。覆盖：

| 页面 | 关键用例 |
|------|---------|
| 首页 `/` | Hero 渲染、精选项目/文章卡片加载出数据、ContactSection 联系表单（姓名/邮箱/留言）可用 |
| 博客列表 `/blog` | 列表加载出数据、分类筛选、标签筛选、分页切换（有分页器时） |
| 文章详情 `/blog/[id]` | MD 渲染（标题/代码块/数学公式元素存在）、阅读量显示、Footer 齐全；**详情页故意不含 NavBar**（2026-08-04 产品决策：沉浸式阅读，不做站点导航） |
| Skill 浏览 `/blog/skills/[id]` | 文件树展开/收起、点击文件显示内容 |
| 项目 `/projects` | 卡片渲染、外链 href 正确、不足一页时居中且无分页器 |
| Admin `/admin` | 登录成功/失败提示、登录后各 Tab 可打开；文章/项目的创建-删除闭环（按 6.4 规则） |

### 7.2 设计还原 + 响应式（`playwright/design/`，权重 25%）

把 `design/intellectual_professional/DESIGN.md` 规范翻译成 DOM 断言：

- **design-system.spec.ts**：导航栏高 80px、页面最大宽 1200px、文章列 720px、卡片边框 `1px solid #E2E8F0`、主按钮背景 `#002045`、字体栈含 Inter 与 Source Serif 4；间距抽样对象为各页主容器（Hero、卡片网格、联系表单区块）的 margin/padding，断言为 8 的倍数
- **responsive.spec.ts**：375px 视口下逐页断言 `scrollWidth <= innerWidth`（无横向溢出）、导航折叠为移动端形态、卡片单列堆叠。Playwright 的 viewport 设置可信，无需手写 CDP 锁视口
- **截图基线**：每个公共页桌面（1280px）+ 移动（375px）各一张 `toHaveScreenshot()` 基线，`maxDiffPixelRatio: 0.01`；基线图 gitignore，首次运行生成，视觉改动后须显式 `--update-snapshots` 确认
- 已知合理偏差（sticky NavBar / pt-12）写进 yaml 注释，断言以实现约定为准

### 7.3 代码质量（`adapters/code-quality.mjs`，权重 20%）

| 子检查 | ID | 通过标准 |
|--------|----|---------|
| 前端类型 | Q-fe-01 | `tsc --noEmit` 零错误（**否决项**） |
| 前端规范 | Q-fe-02 | ESLint（引入 `eslint-config-next`；首次全量基线豁免存量问题，新增代码零告警） |
| 调试残留 | Q-fe-03 | 源码 `console.log` 扫描，仅允许 allowlist 文件 |
| 后端编译 | Q-be-01 | `mvn -q clean compile` 退出码 0 |

ESLint 存量豁免机制：首次运行生成基线文件 `scorecard/eslint-baseline.json`（冻结当前各文件的告警数），此后 `eslint --format json` 结果与基线比对，仅当出现基线外的新增告警时判失败；修复存量问题后用 `--update-eslint-baseline` 刷新基线。

### 7.4 可访问性 + 性能（权重 15%，内部各 50%）

- **a11y**：`@axe-core/playwright` 扫全部公共页。critical/serious 违规 = 该页检查失败；moderate/minor 只记录进报告不扣分
- **perf**：`lighthouse` npm 包，用宿主机 Chrome 对首页、博客列表、文章详情三页跑 performance 类别。单页计分：`min(100, lighthouse分/90*100)`（≥90 满分，线性向下），三页取平均

## 8. 运行模式与命令

```bash
cd scorecard

# 单功能验收：只跑该功能用例 + 全部否决项 + 代码质量
npm run check:feature -- --feature=wechat-share
# → Playwright 过滤 @feature:wechat-share + @core；改过代码时加 --rebuild

# 全站巡检：全量四维
npm run check:all
```

- **功能登记防漏测**：yaml features 中登记的功能若实际执行用例数 < min_tests，判定失败并报「用例不足」，不静默通过
- **环境体检**：run.mjs 开跑前探测 frontend 3000（GET /）与 backend 8880（GET /api/v1/categories）健康；栈未启动则直接退出并提示 `docker compose up -d`，不产生报告
- **`--rebuild` 标志**：自动 `docker compose build frontend backend && docker compose up -d` 后再跑，保证验的是最新构建而非旧容器（历史教训：3000 端口常挂着旧 docker 前端）

## 9. 计分算法与报告

### 9.1 计分

```
维度分 score_d = 该维度通过用例数 / 该维度用例总数 × 100
总分 total   = Σ weight_d × score_d
a11y_perf 分 = 0.5 × a11y分 + 0.5 × perf分

通过判定 = 同时满足：
  ① total ≥ 80（pass_threshold）
  ② core_checks 全部通过（一票否决）
  ③ 每个 yaml 登记的功能，实际执行用例数 ≥ min_tests
```

单功能验收模式下总分只按该功能涉及的用例计算，但否决项与代码质量维度永远全量执行——功能再小也不能把编译弄挂。

### 9.2 报告格式

每次运行产出 `scorecard/reports/<日期时间>-<mode>.md`，提交进 git：

```markdown
# 验收报告 — 全站巡检 | 2026-08-04 15:30
总分：87.5 / 100  ✅ 通过
| 维度 | 得分 | 权重 | 加权 |
|------|------|------|------|
| 功能完成度 | 95.0 | 0.40 | 38.0 |
| 设计还原+响应式 | 82.0 | 0.25 | 20.5 |
| 代码质量 | 100 | 0.20 | 20.0 |
| 可访问性+性能 | 60.0 | 0.15 | 9.0 |
## 功能明细
### 按功能汇总
| 编号 | 功能项 | 用例 | 通过 | 得分 | 状态 |
|------|--------|------|------|------|------|
| 1.2 | 精选文章展示 | 1 | 1 | 100.0 | ✅ |
| 2.1 | 文章列表页 | 4 | 4 | 100.0 | ✅ |
| 1.1 | 精选项目展示 | 0 | — | — | ⚠️ 无覆盖 |
### 逐用例
| 用例 | 功能项 | 状态 |
|------|--------|------|
| [F-home-02] 精选文章卡片 @functional @feature:1.2 | 1.2 | ✅ |
| [F-blog-04] 分页切换 @functional @feature:2.1 | 2.1 | ⏭ 跳过 |
## 失败清单
- [D-spacing-02] 博客列表卡片间距 12px，非 8 倍数
- [P-detail-01] 文章详情 Lighthouse 78 < 90
```

功能明细按 yaml 登记顺序列出：有覆盖的功能显示用例数/通过数/得分，无覆盖的功能标记 ⚠️ 无覆盖（min_tests=0 时不导致失败，仅提示）。

### 9.3 历史追踪

每次运行向 `scores/history.csv` 追加一行并提交：

```csv
date,mode,total,functional,design,code_quality,a11y_perf,passed
2026-08-04T15:30,patrol,87.5,95.0,82.0,100,60.0,true
```

## 10. 项目 Skill

`.claude/skills/acceptance-scorecard/SKILL.md`，指导 AI：

1. **何时跑**：完成一个功能实现后；用户要求验收或巡检时
2. **怎么跑**：改过代码 → `npm run check:feature -- --feature=<id> --rebuild`；巡检 → `npm run check:all`
3. **怎么读**：读最新报告 Markdown；未通过时按失败清单逐项修复并重跑（修复循环上限 3 轮，超过则带报告找用户）
4. **怎么收尾**：报告与 history.csv 一并提交
5. **环境坑位**：3000 端口可能是旧 docker 前端，一律以 docker compose 栈为准；改前端后必须 rebuild frontend 容器

## 11. 异常处理

| 情况 | 行为 |
|------|------|
| docker 栈未启动/不健康 | run.mjs 直接退出，提示启动命令，不产生报告（拒绝打无意义的分） |
| 适配器输出 JSON 缺维度/格式错 | score.mjs 报错终止，不降级计算（宁可失败不出分，不出假分） |
| Playwright 用例超时 | 记为失败；单用例超时 30s，不设重试（失败必须可见，flake 靠修复不靠掩盖） |
| Lighthouse 跑不起来 | perf 子维度记 0 分并在报告中显著标注，不静默跳过 |
| 某维度用例数为 0 | 报告警告「该维度无用例」，按 0 分计 |

## 12. 评分卡系统自身的测试

`scripts/score.mjs` 的计分逻辑用 `node:test` 编写单元测试：加权计算、一票否决、阈值边界（79.9/80/80.1）、空维度处理。计分逻辑是整套体系的地基，必须单测覆盖。

## 13. 范围外（YAGNI）

- CI（GitHub Actions）接入：本次不做，npm + Skill 已够用
- 视觉基线进 git：截图体积大且随内容数据漂移，gitignore 处理，首次运行本地生成
- 对 Admin 增删改全链路的穷举：只覆盖文章/项目两个可删除实体的创建-删除闭环
- 国际化、暗色模式等 v1 范围外功能的检查
