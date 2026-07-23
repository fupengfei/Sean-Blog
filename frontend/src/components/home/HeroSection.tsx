import Link from 'next/link';

/**
 * 首页 Hero 区域
 *
 * 双栏布局（桌面端）：
 * - 左侧：主标题 + 描述文案 + CTA 按钮（查看作品 / 阅读博客）
 * - 右侧：Hero 配图（带 3° 旋转动效，hover 时回正）+ 浮动身份徽章
 *
 * 设计决策：
 * - 图片使用 `rotate-3 hover:rotate-0` 制造视觉趣味性
 * - 浮动徽章仅桌面端显示（`hidden sm:block`），内容硬编码为「JAVA 后端工程师 / AI 应用探索者」
 */
export default function HeroSection() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 pb-24 md:pt-16 md:pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Text */}
        <div className="max-w-[720px]">
          <h1 className="text-3xl sm:text-[48px] font-bold leading-tight sm:leading-[56px] tracking-[-0.02em] text-primary mb-6">
            探索 AI 的无限可能
          </h1>
          <p className="font-body text-lg sm:text-xl leading-relaxed sm:leading-[32px] text-on-surface-variant mb-10">
            本博客基于 Vibe Coding 完整构建、收录原创 AI 一线技术落地感悟，聚焦 AI 技术快速验证 MVP、高效产品化思维，持续探索人工智能的无限可能，在技术浪潮中持续迭代成长。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/projects"
              className="bg-primary text-on-primary px-8 py-3 rounded-lg text-base font-medium hover:shadow-lg transition-all duration-200"
            >
              查看作品
            </Link>
            <Link
              href="/blog"
              className="border border-primary text-primary px-8 py-3 rounded-lg text-base font-medium hover:bg-primary-fixed transition-all duration-200"
            >
              阅读博客
            </Link>
          </div>
        </div>

        {/* Right: Hero image with rotation effect */}
        <div className="relative flex justify-center">
          <div className="aspect-square w-full max-w-md rounded-2xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border border-outline-variant">
            <img
              src="/探索AI无限可能.webp"
              alt="探索 AI 的无限可能"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-outline-variant hidden sm:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center text-secondary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-primary">JAVA 后端工程师</div>
                <div className="text-xs text-on-surface-variant">AI 应用探索者</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
