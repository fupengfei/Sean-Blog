import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import FeaturedArticles from '@/components/home/FeaturedArticles';
import CTASection from '@/components/home/CTASection';

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <FeaturedProjects />
        <FeaturedArticles />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
