import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UniversitySection from "@/components/UniversitySection";
import FeaturedItems from "@/components/FeaturedItems";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <UniversitySection />
        <FeaturedItems />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
