# 文章微信分享功能设计文档

- **日期**：2026-07-28
- **范围**：前端（`frontend/`），后端零改动
- **状态**：待评审

## 1. 背景与目标

博客目前没有任何分享功能。目标是在文章详情页提供微信分享入口：

> 用户点击微信图标 → 展示当前文章的二维码 → 用微信扫码 → 文章在微信内置浏览器中打开 → 用户可自行转发给好友或朋友圈。

这是无需微信官方授权（公众号 / JS-SDK）即可实现微信分享的通用方案。

**成功标准**

- 文章详情页可见微信分享入口，点击后 1 秒内展示二维码
- 二维码编码当前文章的外网 URL，微信「扫一扫」可直接打开
- 桌面端 / 移动端均有可用的展示形态
- 提供复制链接作为非微信场景的补充分享路径

## 2. 用户流程

```
桌面端：
  点击微信图标 → 图标旁弹出悬浮卡片（QR + 文案 + 复制链接）
  → 手机微信扫码 → 微信内打开文章 → 右上角转发好友/朋友圈
  → 点击卡片外 / Esc / × 关闭

移动端：
  点击微信图标 → 屏幕中央弹出轻量模态（QR + 文案 + 复制链接）
  → 截图 → 微信「扫一扫 → 从相册选取」识别二维码打开文章
  → 点击遮罩 / × 关闭
```

## 3. 技术方案

### 3.1 二维码生成：前端 `qrcode.react`

- 新增依赖 `qrcode.react`，使用其 `QRCodeSVG` 组件在客户端渲染矢量二维码
- **不选后端方案**（Spring Boot + zxing）：二维码是纯展示物，内容与当前页面 URL 一一对应，没有理由让后端参与；避免引入 Java 依赖、新 API 和请求往返
- QRCodeSVG 为纯 React 组件，SSR 渲染时只输出占位结构，URL 在 `useEffect`（客户端 mount 后）才计算，**无 `window` SSR 报错风险**

### 3.2 二维码内容

编码 `window.location.href`，即用户当前访问的完整 URL。

- 生产环境：用户经 Nginx（80 端口）访问，URL 即外网文章地址（`https://<domain>/blog/<id>`），微信扫码直达
- 已知限制：本地开发时 URL 为 `localhost:3000/...`，手机扫码无法打开。属预期行为，不处理（可在弹窗提示文案中不承诺可扫，仅生产环境有效）
- URL 保留原样（不剥离 query/hash）：文章页 URL 本身不含敏感参数，保留原样最不易出错

### 3.3 微信图标

使用项目已有依赖 `react-icons` 中的 `FaWeixin`（Font Awesome 微信图标），不新增图标库、不引入外部图片资源。

## 4. 组件设计

### 4.1 新组件 `src/components/blog/WeChatShareButton.tsx`

客户端组件（`'use client'`），自包含，对外零配置：

```tsx
<WeChatShareButton />
```

**内部状态**

| state | 类型 | 说明 |
|-------|------|------|
| `open` | `boolean` | 弹窗是否展开 |
| `copied` | `boolean` | 复制链接成功反馈，1.5s 后自动复位 |
| `url` | `string \| null` | mount 后从 `window.location.href` 取得；为 null 时 QR 区域不渲染 |

**行为**

- 点击微信图标 toggle `open`
- 弹窗打开时：监听 `keydown` Esc 关闭；点击弹窗外部（桌面 popover 用文档 click 监听判断 contain，移动端模态点击遮罩）关闭
- 「复制链接」按钮：`navigator.clipboard.writeText(url)`，成功置 `copied=true` 并 1.5s 后复位；clipboard API 不可用（HTTP 非安全上下文）时降级为隐藏该按钮
- 组件卸载时清理所有监听器与定时器

### 4.2 页面集成 `src/app/blog/[id]/page.tsx`

在文章头部 metadata 行（作者头像 / 阅读时间 / 字数 / 日期所在行）末尾插入 `<WeChatShareButton />`。该行已是 `flex justify-between flex-wrap`，按钮作为新一项加入，窄屏换行时自然流动，无需改动行布局。

## 5. UI 与交互细节

遵循 `design/intellectual_professional/DESIGN.md`：卡片用 1px 边框代替阴影、主色 Navy `#002045`、Inter（UI）+ Source Serif 4（标题文案沿用项目已有的 `font-display`）。

### 5.1 微信图标按钮

- 36px 圆形可点击区域，`FaWeixin` 18px，常态色 WeChat 绿 `#07C160`
- hover：浅绿底（`#07C160` 10% 透明度）+ 图标轻微放大（scale 1.08），150ms 过渡
- 激活态（弹窗打开时）：保持浅绿底，提示当前已展开
- `aria-label="分享到微信"`，`aria-expanded` 同步弹窗状态
- 图标左侧加一条极细分隔线（`1px` `#E2E8F0` 高 16px），与元信息行的文字信息在视觉上分组

### 5.2 弹窗卡片（桌面 popover / 移动模态共用内容）

卡片内容结构（自上而下）：

1. **顶栏**：左侧小号微信绿 `FaWeixin` + 标题「微信扫码分享」（`font-display`，15px，Navy，semibold）；右侧 × 关闭按钮（hover 变灰）
2. **二维码区**：白色内衬 + `1px solid #E2E8F0` 边框的方形容器，内含 160×160 `QRCodeSVG`（`fgColor="#002045"` —— Navy 二维码替代纯黑，与品牌一致且扫码识别率不受影响）；容器四角加 3px 微信绿 L 形角标（取景框样式），呼应扫码动作
3. **主文案**：「打开手机微信，扫一扫二维码」（13px，on-surface-variant）
4. **副文案**：「即可转发给好友或分享到朋友圈」（12px，更浅一级）
5. **复制链接按钮**：次按钮样式（ghost + 1px 边框），图标 + 「复制链接」；点击后图标切换为对勾、文字变「已复制」并显示绿色 `#0a6c44`，1.5s 后复位 —— 即时可感知的反馈
6. **移动端附加提示**（仅 <sm 显示）：「也可截图后，在微信扫一扫中从相册识别」（12px）

### 5.3 两种展示形态

- **桌面（≥sm）**：popover 绝对定位在图标正下方、右对齐（`right-0`，防止越过页面右缘），顶部带指向图标的小箭头。出现动画：`opacity 0→1` + `translateY(-4px)→0` + `scale(0.98)→1`，150ms ease-out，从图标"长出来"的感觉
- **移动（<sm）**：fixed 全屏半透明遮罩（Navy 40% 透明度）+ 居中卡片，卡片出现动画 scale `0.95→1` + fade，200ms。点遮罩关闭
- 两种形态在同一组件内用 Tailwind `sm:` 响应式类切换（popover 容器 `hidden sm:block`，模态 `sm:hidden`），无需 JS 媒体查询

### 5.4 视觉层次

弹窗卡片整体白底、`1px solid #E2E8F0` 边框、`rounded-lg`（8px）、内边距 20px。二维码 Navy 前景 + 微信绿角标，与「复制链接」绿色反馈、标题 Navy 形成品牌三色（Navy / 微信绿 / 辅绿）的小层次，克制但有辨识度。

## 6. 文件变更清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 新增依赖 | `frontend/package.json` | `qrcode.react`（^4.x） |
| 新增 | `frontend/src/components/blog/WeChatShareButton.tsx` | 分享按钮组件（约 150 行） |
| 修改 | `frontend/src/app/blog/[id]/page.tsx` | metadata 行插入组件（2 处：import + JSX） |

后端、数据库、Nginx 配置均无改动。

## 7. 范围内外（YAGNI）

**不做**：

- 微信 JS-SDK 调起原生分享面板（需认证公众号 + 业务域名白名单，属运营资质问题，代码无法解决）
- 分享次数统计 /  analytics 埋点（v1 无此基础设施）
- 其他平台分享按钮（微博 / Twitter 等）——本次仅微信，组件结构不预留扩展点，需要时再加
- 短链接服务（二维码直接编码原 URL，文章 URL 本身不长）
- 文章列表页 / 项目页分享入口——仅文章详情页

## 8. 验证计划

1. `npm install` 后 `npm run dev` 启动前端
2. CDP（Chrome DevTools Protocol）驱动浏览器验证（参照项目惯例，窄屏截图不用 `chrome --screenshot`）：
   - 桌面视口（1280px）：文章页 metadata 行出现微信图标 → 点击弹出 popover，位置不越界、箭头指向图标 → 二维码清晰渲染 → 点外部 / Esc 关闭
   - 移动视口（375px）：点击弹出居中模态 + 附加截图提示 → 点遮罩关闭
   - 「复制链接」：点击后文案切换为「已复制」且剪贴板内容与文章 URL 一致
3. 二维码内容校验：用扫码工具解析出 URL，确认等于当前文章地址
4. `npm run build` 通过，无 TypeScript / SSR 报错
