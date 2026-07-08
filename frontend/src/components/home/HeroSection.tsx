import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[48px] font-bold leading-tight tracking-tight text-primary mb-6">
              探索 AI 的无限可能
            </h1>
            <p className="text-lg sm:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-xl">
              分享技术见解、项目实践与学习心得，在人工智能时代持续探索与成长。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/projects"
                className="inline-flex items-center justify-center px-8 py-3 rounded bg-primary text-white font-medium text-sm transition-opacity hover:opacity-90"
              >
                查看作品
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center px-8 py-3 rounded border border-primary text-primary font-medium text-sm transition-colors hover:bg-primary hover:text-white"
              >
                阅读博客
              </Link>
            </div>
          </div>

          {/* Right: Placeholder illustration */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md aspect-square rounded-lg bg-surface-container flex flex-col items-center justify-center border border-outline-variant">
              <svg
                className="w-24 h-24 text-primary/30 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              <p className="text-sm text-on-surface-variant/50">AI 探索之旅</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
