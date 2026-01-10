import { ShoppingBag, Instagram, Twitter, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                barndle'<span className="text-primary"> hotmarket</span>
              </span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed">
              Nigeria's largest student marketplace for fairly used items. Buy and sell within your campus community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-background/70 hover:text-background transition-colors text-sm">Browse Items</Link></li>
              <li><Link to="/sell" className="text-background/70 hover:text-background transition-colors text-sm">Sell an Item</Link></li>
              <li><Link to="/request" className="text-background/70 hover:text-background transition-colors text-sm">Request an Item</Link></li>
              <li><Link to="/how-it-works" className="text-background/70 hover:text-background transition-colors text-sm">How It Works</Link></li>
            </ul>
          </div>

          {/* Universities */}
          <div>
            <h4 className="font-display font-bold mb-4">Universities</h4>
            <ul className="space-y-3">
              <li><span className="text-background/70 text-sm">University of Benin</span></li>
              <li><span className="text-background/70 text-sm">University of Lagos</span></li>
              <li><span className="text-background/70 text-sm">Lagos State University</span></li>
              <li><span className="text-background/70 text-sm">+ 3 more campuses</span></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-bold mb-4">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/faq" className="text-background/70 hover:text-background transition-colors text-sm">FAQ</Link></li>
              <li><Link to="/contact" className="text-background/70 hover:text-background transition-colors text-sm">Contact Us</Link></li>
              <li><Link to="/terms" className="text-background/70 hover:text-background transition-colors text-sm">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-background/70 hover:text-background transition-colors text-sm">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-sm">
            © 2024 barndle' hotmarket. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
