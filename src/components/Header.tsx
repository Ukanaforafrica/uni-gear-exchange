import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, MessageCircle, Bell } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { unreadCount, markAsSeen } = useNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="barndle' hotmarket" className="w-10 h-10 rounded-xl object-cover" />
            <span className="font-display text-xl font-bold text-foreground">
              barndle'<span className="text-primary"> hotmarket</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Marketplace</Link>
                <Link to="/negotiations" className="text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1" onClick={markAsSeen}>
                  <MessageCircle className="w-4 h-4" />Negotiations
                </Link>
                <Link to="/negotiations" className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" onClick={markAsSeen} aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold leading-none px-1 shadow-sm animate-in zoom-in-50 duration-200">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Home</Link>
                <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Marketplace</Link>
                <Link to="/request" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Request Item</Link>
                <Link to="/sell" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Sell Item</Link>
              </>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {profile && (
                  <span className="text-sm text-muted-foreground font-medium">
                    📍 {profile.university}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link to="/profile">
                    <User className="w-4 h-4" />
                    {profile?.full_name || "Profile"}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {user ? (
                <>
                  <Link to="/marketplace" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>Marketplace</Link>
                  <Link to="/negotiations" className="text-foreground font-medium py-2 flex items-center gap-2" onClick={() => { setIsMenuOpen(false); markAsSeen(); }}>
                    <MessageCircle className="w-4 h-4" />Negotiations
                  </Link>
                  <Link to="/negotiations" className="text-foreground font-medium py-2 flex items-center gap-2" onClick={() => { setIsMenuOpen(false); markAsSeen(); }}>
                    <div className="relative">
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-0.5">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    Notifications
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>Home</Link>
                  <Link to="/marketplace" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>Marketplace</Link>
                  <Link to="/request" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>Request Item</Link>
                  <Link to="/sell" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>Sell Item</Link>
                </>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    {profile && (
                      <span className="text-sm text-muted-foreground font-medium py-2">
                        📍 {profile.university} • {profile.full_name}
                      </span>
                    )}
                    <Button variant="outline" onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="w-full">
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
