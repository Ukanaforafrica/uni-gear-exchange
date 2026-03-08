import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Clock, Tag } from "lucide-react";
import type { ItemRequest } from "@/lib/types";

const Marketplace = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("item_requests")
        .select("*")
        .order("created_at", { ascending: false });
      setRequests((data as ItemRequest[]) || []);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              {profile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-semibold mb-3">
                  📍 {profile.university} Marketplace
                </div>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Campus Requests
              </h1>
              <p className="text-muted-foreground mt-1">
                See what students {profile ? `at ${profile.university}` : ""} are looking for
              </p>
            </div>
            <Button asChild>
              <Link to="/request">
                <Plus className="w-4 h-4" />
                New Request
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-6 animate-pulse shadow-soft">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">No requests yet</h2>
              <p className="text-muted-foreground mb-6">Be the first to post a request on your campus!</p>
              <Button asChild>
                <Link to="/request">
                  <Plus className="w-4 h-4" />
                  Post a Request
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {req.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-2">{req.title}</h3>
                  {req.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{req.description}</p>
                  )}
                  {(req.budget_min > 0 || req.budget_max > 0) && (
                    <div className="text-sm font-semibold text-primary">
                      ₦{req.budget_min.toLocaleString()} — ₦{req.budget_max.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
