// =============================================================================
// Sean's AI World Blog — Tailwind CSS 配置
// =============================================================================
// 设计系统定义在 design/intellectual_professional/DESIGN.md
// 所有 UI 组件必须使用此处定义的 Token，不直接使用硬编码颜色值
// =============================================================================

import type { Config } from 'tailwindcss'

const config: Config = {
  // 扫描 src/ 目录下所有组件文件，按需生成 CSS
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // 颜色系统（Material Design 3 语义色命名法）
      // 主色 Navy #002045，辅色 Green #0a6c44
      // -----------------------------------------------------------------------
      colors: {
        // 主色系列：Navy 深蓝色系
        primary: {
          DEFAULT: '#002045',          // 主色，用于按钮、链接、强调元素
          container: '#1a365d',        // 主色容器，用于卡片背景、标签等
          fixed: '#d6e3ff',            // 主色固定色，用于浅色背景上的强调
        },
        // 辅色系列：Green 绿色系
        secondary: {
          DEFAULT: '#0a6c44',          // 辅色，用于次要按钮、辅助强调
          container: '#9ff5c1',        // 辅色容器，用于成功状态标签
        },
        // 表面色系列：浅灰蓝色调，用于页面背景、卡片
        surface: {
          DEFAULT: '#f9f9ff',          // 默认页面背景色
          'container-lowest': '#ffffff',   // 最底层容器（纯白卡片）
          'container-low': '#f1f3ff',      // 低层容器
          container: '#e8eeff',            // 默认容器背景
          'container-high': '#e3e8f9',     // 高层容器（hover 状态等）
          'container-highest': '#dde2f3',  // 最高层容器（active 状态等）
        },
        // 内容色：文字颜色
        'on-surface': '#161c27',            // 正文文字色（在表面色上的文字）
        'on-surface-variant': '#43474e',    // 次要文字色
        'on-primary': '#ffffff',            // 在主色上的文字色（白色）
        'on-primary-container': '#86a0cd',  // 在主色容器上的文字色
        'on-secondary': '#ffffff',          // 在辅色上的文字色（白色）
        // 轮廓色：边框颜色
        'outline-variant': '#c4c6cf',       // 卡片边框色（替代阴影）
        outline: '#74777f',                 // 输入框/聚焦边框色
      },
      // -----------------------------------------------------------------------
      // 字体系统
      // Inter: UI 组件、标题、导航（现代无衬线字体）
      // Source Serif 4: 文章正文（衬线字体，阅读体验更好）
      // -----------------------------------------------------------------------
      fontFamily: {
        display: ['Inter', 'sans-serif'],                // 大标题展示字体
        body: ['"Source Serif 4"', 'serif'],             // 文章正文字体
        ui: ['Inter', 'sans-serif'],                     // UI 组件字体
      },
      // -----------------------------------------------------------------------
      // 动画系统：公告横幅专用
      // banner-sheen: 低透明度光带扫过（前 25% 时间扫完，其余时间停顿，6s 一轮）
      // banner-pulse: NEW 徽章柔和呼吸脉冲
      // -----------------------------------------------------------------------
      keyframes: {
        'banner-sheen': {
          '0%': { transform: 'translateX(-100%) skewX(-12deg)' },
          '25%, 100%': { transform: 'translateX(350%) skewX(-12deg)' },
        },
        'banner-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'banner-sheen': 'banner-sheen 6s ease-in-out infinite',
        'banner-pulse': 'banner-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  // Tailwind Typography 插件：为 Markdown 渲染的 HTML 提供排版样式
  plugins: [require('@tailwindcss/typography')],
}
export default config
