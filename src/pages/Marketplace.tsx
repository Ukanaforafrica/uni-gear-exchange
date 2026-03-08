import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Clock, Tag, ShoppingBag, Camera, MessageCircle } from "lucide-react";
import NegotiationChat from "@/components/NegotiationChat";
import { useNegotiation } from "@/hooks/useNegotiation";
import type { ItemRequest, Item } from "@/lib/types";

const Marketplace = () => {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    chatOpen,
    setChatOpen,
    activeNegotiationId,
    chatTitle,
    chatOtherUser,
    startNegotiation,
  } = useNegotiation();

  useEffect(() => {
    const fetchData = async () => {
      const [reqRes, itemRes] = await Promise.all([
        (supabase as any).from("item_requests").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("items").select("*").order("created_at", { ascending: false }),
      ]);
      setRequests((reqRes.data as ItemRequest[]) || []);
      setItems((itemRes.data as Item[]) || []);
      setLoading(false);
    };
    fetchData();
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

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const SkeletonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-6 animate-pulse shadow-soft">
          <div className="h-32 bg-muted rounded-xl mb-3" />
          <div className="h-4 bg-muted rounded w-3/4 mb-3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              {profile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-semibold mb-3">
                  📍 {profile.university} HotMarket
                </div>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Campus Marketplace
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse items and requests {profile ? `at ${profile.university}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/request">
                  <Plus className="w-4 h-4" />
                  Request Item
                </Link>
              </Button>
              <Button asChild>
                <Link to="/sell">
                  <ShoppingBag className="w-4 h-4" />
                  Sell Item
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="items" className="gap-1.5">
                <Camera className="w-4 h-4" />
                Items for Sale ({items.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5">
                <Search className="w-4 h-4" />
                Requests ({requests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              {loading ? (
                <SkeletonCards />
              ) : items.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">No items listed yet</h2>
                  <p className="text-muted-foreground mb-6">Be the first to sell something on your campus!</p>
                  <Button asChild>
                    <Link to="/sell"><Plus className="w-4 h-4" />List an Item</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div key={item.id} className="bg-card rounded-2xl shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                      <div className="aspect-[4/3] bg-muted relative">
                        {item.photos.length > 0 ? (
                          <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Camera className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          <Badge className="text-xs bg-background/80 text-foreground backdrop-blur-sm">{item.condition}</Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm border-none flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft(item.expires_at)}d left
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-bold text-foreground text-lg mb-1 line-clamp-1">{item.title}</h3>
                        {item.defects && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">⚠️ {item.defects}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">₦{item.price.toLocaleString()}</span>
                          {item.negotiable && <Badge variant="outline" className="text-xs">Negotiable</Badge>}
                        </div>
                        {item.usage_duration && (
                          <p className="text-xs text-muted-foreground mt-1">Used: {item.usage_duration}</p>
                        )}
                        {user && item.user_id !== user.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3 gap-1.5"
                            onClick={() =>
                              startNegotiation({
                                itemId: item.id,
                                itemType: "item",
                                sellerId: item.user_id,
                                itemTitle: item.title,
                              })
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Negotiate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              {loading ? (
                <SkeletonCards />
              ) : requests.length === 0 ? (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">No requests yet</h2>
                  <p className="text-muted-foreground mb-6">Be the first to post a request on your campus!</p>
                  <Button asChild>
                    <Link to="/request"><Plus className="w-4 h-4" />Post a Request</Link>
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
                      {user && req.user_id !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 gap-1.5"
                          onClick={() =>
                            startNegotiation({
                              itemRequestId: req.id,
                              itemType: "request",
                              sellerId: req.user_id,
                              itemTitle: req.title,
                            })
                          }
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          I Have This
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      <NegotiationChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        negotiationId={activeNegotiationId}
        itemTitle={chatTitle}
        otherUserName={chatOtherUser}
      />
    </div>
  );
};

export default Marketplace;
