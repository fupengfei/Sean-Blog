import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import FeaturedArticles from '@/components/home/FeaturedArticles';
import ContactSection from '@/components/about/ContactSection';

/**
 * 首页（/）
 *
 * 页面结构：NavBar + HeroSection + FeaturedProjects + FeaturedArticles + ContactSection + Footer
 *
 * 特点：
 * - 纯展示型页面，无需数据请求（各子组件内部自行拉取数据）
 * - 服务端组件，无客户端交互
 * - 每个 Section 为独立组件，便于维护和复用
 */
export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <FeaturedProjects />
        <FeaturedArticles />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
