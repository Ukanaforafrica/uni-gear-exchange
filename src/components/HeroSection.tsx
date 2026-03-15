import { Button } from "@/components/ui/button";
import { Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 gradient-warm" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      
      {/* Floating Elements */}
      <div className="absolute top-32 left-[15%] w-16 h-16 bg-primary/20 rounded-2xl rotate-12 animate-float" />
      <div className="absolute top-48 right-[20%] w-12 h-12 bg-secondary/20 rounded-full animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-32 left-[25%] w-20 h-20 bg-accent/20 rounded-3xl -rotate-12 animate-float" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-soft mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Nigeria's Largest Student Marketplace</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Sell, request and buy{" "}
            <span className="text-gradient">anything</span>{" "}
            around your campus
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>Don't pay until you see the product with your koro-koro eyes. Schedule time and location of pickup to seal the deal.


          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" asChild>
              <Link to="/request">
                <Search className="w-5 h-5" />
                Request an Item
              </Link>
            </Button>
            <Button variant="hero-secondary" asChild>
              <Link to="/sell">
                <ShoppingCart className="w-5 h-5" />
                Sell Your Item
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">6</div>
              <div className="text-sm text-muted-foreground">Universities</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">1K+</div>
              <div className="text-sm text-muted-foreground">Active Listings</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Happy Students</div>
            </div>
          </div>
        </div>
      </div>
    </section>);

};

export default HeroSection;