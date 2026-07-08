import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';

const skills = [
  { name: 'React', icon: ReactIcon },
  { name: 'TypeScript', icon: TypeScriptIcon },
  { name: 'Next.js', icon: NextJsIcon },
  { name: 'Spring Boot', icon: SpringIcon },
  { name: 'Java', icon: JavaIcon },
  { name: 'MyBatis', icon: MyBatisIcon },
  { name: 'MySQL', icon: MySQLIcon },
  { name: 'Docker', icon: DockerIcon },
  { name: 'AI / LLM', icon: AIIcon },
  { name: 'Tailwind CSS', icon: TailwindIcon },
];

// ---------------------------------------------------------------------------
// Inline SVG icons for each skill
// ---------------------------------------------------------------------------

function ReactIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <circle cx="12" cy="12" r="2.16" fill="#61DAFB" />
      <ellipse cx="12" cy="12" rx="9.36" ry="3.6" fill="none" stroke="#61DAFB" strokeWidth="0.72" />
      <ellipse cx="12" cy="12" rx="9.36" ry="3.6" fill="none" stroke="#61DAFB" strokeWidth="0.72" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.36" ry="3.6" fill="none" stroke="#61DAFB" strokeWidth="0.72" transform="rotate(120 12 12)" />
    </svg>
  );
}

function TypeScriptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#3178C6]">
      <rect width="24" height="24" rx="2" fill="#3178C6" />
      <text x="3.5" y="17" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">TS</text>
    </svg>
  );
}

function NextJsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.357 18.72L9.06 12.986V18h-1.2V6h1.2l6.297 7.714V6h1.2v12.72h-1.2z" />
    </svg>
  );
}

function SpringIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#6DB33F]">
      <path d="M20.44 2.61C18.2 1.29 15.38.52 12.53.52A10.92 10.92 0 001.59 11.47c0 4.6 2.88 8.56 7.01 10.16.34.06.46-.15.46-.33v-1.15c-2.85.62-3.43-1.37-3.43-1.37-.47-1.19-1.14-1.5-1.14-1.5-.93-.64.07-.63.07-.63 1.03.07 1.57 1.06 1.57 1.06.92 1.57 2.4 1.12 2.99.85.09-.66.36-1.12.65-1.37-2.28-.26-4.68-1.14-4.68-5.08 0-1.12.4-2.04 1.06-2.76-.11-.26-.46-1.3.1-2.72 0 0 .86-.28 2.82 1.05a9.8 9.8 0 015.14 0c1.96-1.33 2.82-1.05 2.82-1.05.56 1.42.21 2.46.1 2.72.66.72 1.06 1.64 1.06 2.76 0 3.95-2.4 4.82-4.69 5.07.37.32.7.95.7 1.91v2.83c0 .18.12.39.46.33a10.98 10.98 0 007.01-10.16A10.92 10.92 0 0012.53.52c-.95 0-.95 0 0 0z" />
    </svg>
  );
}

function JavaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M8.43 18.57c.97.14 2.04.22 3.57.22s2.6-.08 3.57-.22c-1.39.88-3.57 1.17-3.57 1.17s-2.18-.29-3.57-1.17z" fill="#F89820" />
      <path d="M8.77 16.33c.97.18 2.08.27 3.23.27s2.26-.09 3.23-.27c-1.25.79-3.23 1.05-3.23 1.05s-1.98-.26-3.23-1.05z" fill="#F89820" />
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zM3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9z" fill="#E76F00" />
      <text x="6.5" y="16" fontSize="10" fontWeight="bold" fill="#E76F00" fontFamily="sans-serif">Java</text>
    </svg>
  );
}

function MyBatisIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#CD0000]">
      <rect width="24" height="24" rx="4" fill="#CD0000" />
      <text x="4" y="16" fontSize="10" fontWeight="bold" fill="white" fontFamily="sans-serif">MB</text>
    </svg>
  );
}

function MySQLIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#4479A1]">
      <path d="M16.21 13.62c-.03-.19-.15-.44-.62-.62-.38-.15-.9-.23-1.56-.29-.14-.01-.28-.02-.42-.04l.03-.06c.33-.69.47-1.26.37-1.65-.15-.6-.7-.89-1.78-.59-.48.13-.99.38-1.48.66.3-.91.49-1.56.55-1.88.08-.48-.08-.87-.45-.94-.36-.07-.82.23-1.25.82-.3.41-.61.94-.91 1.53-.13-.02-.27-.03-.41-.05-1.24-.15-2.29-.02-2.88.37-.89.59-.89 1.36-.48 1.77.55.54 1.52.58 2.59.27.09-.03.18-.06.27-.09-.12.31-.19.63-.2.93 0 .23.06.44.16.6-.68.06-1.2.16-1.56.34-.59.3-.62.75-.64.96-.03.27.11.57.39.78.41.3 1.08.44 1.91.44.36 0 .74-.03 1.13-.09 1.46-.22 2.64-.82 3.32-1.58.63-.7.83-1.44.6-1.88-.03-.06-.08-.13-.13-.19zM12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0z" />
    </svg>
  );
}

function DockerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#2496ED]">
      <path d="M13.98 11.08h2.16V9.26h-2.16v1.82zm0-2.27h2.16V7h-2.16v1.81zm-2.27 2.27h2.16V9.26h-2.16v1.82zm0-2.27h2.16V7h-2.16v1.81zm-2.27 2.27h2.16V9.26H9.44v1.82zm0-2.27h2.16V7H9.44v1.81zm-2.28 2.27h2.16V9.26H7.16v1.82zm4.55 4.09h-2.1v-1.82h2.1v1.82zm-2.27-1.82H7.16v1.82h2.28v-1.82zm7.85-6.64c-.33-.24-.77-.38-1.28-.42l-.34-.02.08-.33c.13-.54.05-1.01-.24-1.33-.17-.19-.41-.29-.73-.3-.64-.03-1.22.32-1.72.93l-.24.3-.32-.21c-.57-.37-1.22-.57-1.88-.57-1.65 0-3.04.95-3.7 2.41l-.14.29H2.71c-.4 0-.77.1-1.09.3-.32.2-.57.49-.72.84-.15.35-.19.74-.11 1.14.04.22.12.41.21.57-.27.08-.5.22-.66.41-.18.21-.27.47-.28.75-.04.99.71 1.82 1.69 1.91h16.8c1.56 0 2.8-.55 3.58-1.58.72-.93 1.06-2.13 1.01-3.46-.04-1.1-.53-2.01-1.36-2.55z" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-secondary" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function TailwindIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#06B6D4]">
      <path d="M12 5C9.5 5 7.91 6.42 7.27 9.25c.95-1.42 2.05-1.95 3.32-1.6.72.2 1.23.74 1.8 1.34.93.98 2.01 2.12 4.36 2.12 2.5 0 4.09-1.42 4.73-4.25-.95 1.42-2.05 1.95-3.32 1.6-.72-.2-1.23-.74-1.8-1.34C15.43 6.14 14.35 5 12 5zM7.27 12.25C4.77 12.25 3.18 13.67 2.54 16.5c.95-1.42 2.05-1.95 3.32-1.6.72.2 1.23.74 1.8 1.34.93.98 2.01 2.12 4.36 2.12 2.5 0 4.09-1.42 4.73-4.25-.95 1.42-2.05 1.95-3.32 1.6-.72-.2-1.23-.74-1.8-1.34-.93-.98-2.01-2.12-4.36-2.12z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          {/* Photo placeholder */}
          <div className="w-40 h-40 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
            <svg
              className="w-16 h-16 text-outline-variant"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>

          {/* Bio */}
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3">
              Sean
            </h2>
            <p className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
              全栈工程师 / AI 探索者
            </p>
            <p className="text-base text-on-surface-variant leading-relaxed max-w-2xl">
              热爱技术，专注于 Web 全栈开发与人工智能应用。拥有多年的企业级软件开发经验，
              擅长 Spring Boot 后端架构与 React 前端生态。持续关注大语言模型（LLM）和 AI Agent
              等前沿技术，致力于用技术创造有价值的产品。业余时间喜欢写技术博客，分享学习心得与实践经验。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkillsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3 text-center">
          技术栈
        </h2>
        <p className="text-sm text-on-surface-variant text-center mb-12 max-w-lg mx-auto">
          日常工作中使用的主要技术与工具
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="flex flex-col items-center gap-3 p-5 rounded-lg border border-outline-variant bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              <skill.icon />
              <span className="text-xs font-medium text-on-surface-variant text-center">
                {skill.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3 text-center">
          联系方式
        </h2>
        <p className="text-sm text-on-surface-variant text-center mb-12 max-w-lg mx-auto">
          欢迎技术交流与合作
        </p>

        <div className="max-w-md mx-auto space-y-4">
          {/* Email */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-outline-variant">
            <svg
              className="w-5 h-5 text-secondary flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <div>
              <p className="text-xs text-on-surface-variant/60 mb-0.5">邮箱</p>
              <p className="text-sm font-medium text-on-surface">sean@example.com</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-outline-variant">
            <svg
              className="w-5 h-5 text-secondary flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <div>
              <p className="text-xs text-on-surface-variant/60 mb-0.5">位置</p>
              <p className="text-sm font-medium text-on-surface">上海 / 深圳</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen">
        {/* Banner */}
        <section className="bg-primary text-white py-16 md:py-24">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              关于我
            </h1>
            <p className="text-base text-white/70 max-w-2xl leading-relaxed">
              一名热爱技术、持续学习的全栈工程师，在 AI 浪潮中探索前行。
            </p>
          </div>
        </section>

        <ProfileSection />
        <SkillsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
