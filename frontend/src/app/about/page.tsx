import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import CTASection from '@/components/home/CTASection';
import {
  SiSpringboot,
  SiSpring,
  SiApachekafka,
  SiMysql,
  SiRedis,
  SiDocker,
  SiClaudecode,
} from 'react-icons/si';
import { FaMugSaucer, FaGlobe } from 'react-icons/fa6';

// ---------------------------------------------------------------------------
// Skills data — v1 硬编码在前端组件中
// ---------------------------------------------------------------------------

const skills = [
  { name: 'Java', icon: JavaIcon, color: '#ED8B00' },
  { name: 'Spring Boot', icon: SpringBootIcon, color: '#6DB33F' },
  { name: 'Spring Cloud', icon: SpringCloudIcon, color: '#6DB33F' },
  { name: 'Spring AI', icon: SpringAIIcon, color: '#6DB33F' },
  { name: 'Kafka', icon: KafkaIcon, color: '#231F20' },
  { name: 'MySQL', icon: MySQLIcon, color: '#4479A1' },
  { name: 'Redis', icon: RedisIcon, color: '#DC382D' },
  { name: 'VS Code', icon: VSCodeIcon, color: '#007ACC' },
  { name: 'Claude Code', icon: ClaudeCodeIcon, color: '#D97757' },
  { name: 'Docker', icon: DockerIcon, color: '#2496ED' },
];

// ---------------------------------------------------------------------------
// Icons — using react-icons (Simple Icons) for accuracy, plus custom
// inline SVG for VS Code (not included in this version of react-icons).
// ---------------------------------------------------------------------------

function JavaIcon() {
  return <FaMugSaucer className="w-7 h-7" color="#ED8B00" />;
}

function SpringBootIcon() {
  return <SiSpringboot className="w-7 h-7" color="#6DB33F" />;
}

function SpringCloudIcon() {
  return <SiSpring className="w-7 h-7" color="#6DB33F" />;
}

function SpringAIIcon() {
  return <SiSpring className="w-7 h-7" color="#6DB33F" />;
}

function KafkaIcon() {
  return <SiApachekafka className="w-7 h-7" color="#231F20" />;
}

function MySQLIcon() {
  return <SiMysql className="w-7 h-7" color="#4479A1" />;
}

function RedisIcon() {
  return <SiRedis className="w-7 h-7" color="#DC382D" />;
}

function ClaudeCodeIcon() {
  return <SiClaudecode className="w-7 h-7" color="#D97757" />;
}

function DockerIcon() {
  return <SiDocker className="w-7 h-7" color="#2496ED" />;
}

function VSCodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#007ACC]">
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
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
          {/* Avatar */}
          <div className="w-40 h-40 rounded-full overflow-hidden flex-shrink-0 border-2 border-outline-variant">
            <img
              src="/头像.webp"
              alt="Sean"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Bio */}
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3">
              Sean
            </h2>
            <p className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
              JAVA 后端工程师 / AI 应用探索者
            </p>
            <p className="text-base text-on-surface-variant leading-relaxed max-w-2xl">
              热爱技术，专注于 Java 后端开发与人工智能应用。拥有多年的企业级软件开发经验，
              擅长 Spring Boot / Spring Cloud 微服务架构，对消息队列、缓存和分布式系统有深入理解。
              持续关注 Spring AI 和大语言模型（LLM）等前沿技术，致力于用技术创造有价值的产品。
              业余时间喜欢写技术博客，分享学习心得与实践经验。
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

// ---------------------------------------------------------------------------
// World Footprints data — v1 硬编码旅行足迹
// ---------------------------------------------------------------------------

interface Country {
  nameZh: string;
  nameEn: string;
}

const footprints: Record<string, Country[]> = {
  'Asia / 亚洲': [
    { nameZh: '新加坡', nameEn: 'Singapore' },
    { nameZh: '马来西亚', nameEn: 'Malaysia' },
    { nameZh: '泰国', nameEn: 'Thailand' },
    { nameZh: '日本', nameEn: 'Japan' },
    { nameZh: '韩国', nameEn: 'South Korea' },
    { nameZh: '印度尼西亚', nameEn: 'Indonesia' },
    { nameZh: '马尔代夫', nameEn: 'Maldives' },
  ],
  'Europe / 欧洲': [
    { nameZh: '奥地利', nameEn: 'Austria' },
    { nameZh: '德国', nameEn: 'Germany' },
    { nameZh: '瑞典', nameEn: 'Sweden' },
    { nameZh: '挪威', nameEn: 'Norway' },
  ],
};

function WorldFootprintsSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3 text-center">
          我的世界足迹
        </h2>
        <p className="text-sm text-on-surface-variant text-center mb-16 max-w-lg mx-auto">
          在代码之外，我热爱探索世界的每一个角落，从北欧的极光到南亚的清澈透蓝，一路山河见闻，是我成长的重要足迹。
        </p>

        <div className="space-y-14">
          {Object.entries(footprints).map(([region, countries]) => (
            <div key={region}>
              {/* Region divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-outline-variant/30" />
                <span className="font-semibold text-xs text-secondary uppercase tracking-[0.15em] whitespace-nowrap">
                  {region}
                </span>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>

              {/* Country cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto justify-center">
                {countries.map((country) => (
                  <div
                    key={country.nameEn}
                    className="flex flex-col items-center p-6 bg-background border border-outline-variant/50 rounded-xl hover:border-secondary/50 transition-all group"
                  >
                    <FaGlobe className="w-5 h-5 text-secondary/40 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-on-surface">
                      {country.nameZh}
                    </span>
                    <span className="text-[10px] text-on-surface-variant uppercase mt-0.5">
                      {country.nameEn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 关于我页面（/about） — 纯静态、服务端组件、无数据请求
// ---------------------------------------------------------------------------

/**
 * 关于我页面（/about）
 *
 * 特点：
 * - 服务端组件，无客户端数据请求
 * - 所有内容 v1 硬编码在前端（个人简介、技能、旅行足迹）
 *
 * 页面结构：
 * - Banner 标题区（左侧 primary 边框装饰）
 * - ProfileSection：头像 + 个人简介
 * - SkillsSection：技术栈网格（10 项技术 / 工具）
 * - WorldFootprintsSection：亚洲 + 欧洲旅行足迹卡片
 * - CTASection：行动号召
 */
export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen">
        {/* Banner — 匹配设计稿简洁风格 */}
        <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto">
          <div className="border-l-4 border-primary pl-6 py-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4">
              关于我
            </h1>
            <p className="text-base text-on-surface-variant max-w-2xl leading-relaxed">
              一名热爱生活、持续成长的 JAVA 后端工程师，在 AI 浪潮中探索前行。
            </p>
          </div>
        </section>

        <ProfileSection />
        <SkillsSection />
        <WorldFootprintsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
