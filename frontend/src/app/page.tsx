import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import FeaturedArticles from '@/components/home/FeaturedArticles';
import ContactSection from '@/components/about/ContactSection';

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
