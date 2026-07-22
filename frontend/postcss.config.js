// =============================================================================
// Sean's AI World Blog — PostCSS 配置
// 用于 Next.js 构建流程中的 CSS 后处理
// - tailwindcss: 编译 Tailwind CSS 工具类，按需生成最终 CSS
// - autoprefixer: 自动添加浏览器厂商前缀（-webkit-, -moz- 等），保证兼容性
// =============================================================================
module.exports = {
  plugins: {
    tailwindcss: {},    // Tailwind CSS 编译器
    autoprefixer: {},   // CSS 自动前缀
  },
};
