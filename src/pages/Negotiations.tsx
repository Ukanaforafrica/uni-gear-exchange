import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, ArrowRight, ShoppingBag, Search } from "lucide-react";
import NegotiationChat from "@/components/NegotiationChat";
import type { Negotiation, NegotiationMessage } from "@/lib/types";

interface NegotiationWithDetails extends Negotiation {
  itemTitle: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  messageCount: number;
}

const Negotiations = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { unreadByChat, markChatAsSeen } = useNotifications();
  const [negotiations, setNegotiations] = useState<NegotiationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState("");
  const [activeChatUser, setActiveChatUser] = useState("");
  const activeChatIdRef = useRef<string | null>(null);

  // Keep ref in sync so realtime callback sees latest value
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Listen for new messages across all negotiations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_messages",
        },
        async (payload) => {
          const msg = payload.new as NegotiationMessage;
          // Don't notify for own messages or if the chat is already open
          if (msg.sender_id === user.id) return;
          if (activeChatIdRef.current === msg.negotiation_id) return;

          // Get sender name
          const { data: senderProfile } = await (supabase as any)
            .from("profiles")
            .select("full_name")
            .eq("id", msg.sender_id)
            .single();

          const senderName = senderProfile?.full_name || "Someone";
          const preview = msg.message_type === "text"
            ? msg.message.slice(0, 60) + (msg.message.length > 60 ? "…" : "")
            : msg.message_type === "image" ? "📷 Sent an image"
            : msg.message_type === "voice" ? "🎙️ Sent a voice note"
            : msg.message_type === "video" ? "🎥 Sent a video"
            : "New message";

          toast({
            title: `💬 ${senderName}`,
            description: preview || "New message",
          });

          // Update the negotiation list to reflect new message
          setNegotiations((prev) =>
            prev.map((n) =>
              n.id === msg.negotiation_id
                ? { ...n, lastMessage: preview, messageCount: n.messageCount + 1 }
                : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    const fetchNegotiations = async () => {
      const { data: negs } = await (supabase as any)
        .from("negotiations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!negs || negs.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch related data
      const enriched: NegotiationWithDetails[] = await Promise.all(
        (negs as Negotiation[]).map(async (neg) => {
          // Get item/request title
          let itemTitle = "Unknown item";
          if (neg.item_type === "item" && neg.item_id) {
            const { data } = await (supabase as any).from("items").select("title").eq("id", neg.item_id).single();
            if (data) itemTitle = data.title;
          } else if (neg.item_type === "request" && neg.item_request_id) {
            const { data } = await (supabase as any).from("item_requests").select("title").eq("id", neg.item_request_id).single();
            if (data) itemTitle = data.title;
          }

          // Get other user's name
          const otherId = neg.buyer_id === user.id ? neg.seller_id : neg.buyer_id;
          const { data: otherProfile } = await (supabase as any).from("profiles").select("full_name, avatar_url").eq("id", otherId).single();
          const otherUserName = otherProfile?.full_name || "Unknown";
          const otherUserAvatar = otherProfile?.avatar_url || "";

          // Get message count and last message
          const { data: msgs } = await (supabase as any)
            .from("negotiation_messages")
            .select("message, created_at")
            .eq("negotiation_id", neg.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            ...neg,
            itemTitle,
            otherUserName,
            otherUserAvatar,
            lastMessage: msgs?.[0]?.message,
            messageCount: 0, // We'll get count separately
          };
        })
      );

      // Get message counts
      for (const neg of enriched) {
        const { count } = await (supabase as any)
          .from("negotiation_messages")
          .select("*", { count: "exact", head: true })
          .eq("negotiation_id", neg.id);
        neg.messageCount = count || 0;
      }

      setNegotiations(enriched);
      setLoading(false);
    };

    fetchNegotiations();
  }, [user]);

  const openChat = (neg: NegotiationWithDetails) => {
    setActiveChatId(neg.id);
    setActiveChatTitle(neg.itemTitle);
    setActiveChatUser(neg.otherUserName);
    markChatAsSeen(neg.id);
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Sign in to view negotiations</h2>
            <p className="text-muted-foreground mb-6">You need an account to negotiate with sellers and buyers.</p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline"><Link to="/login">Log In</Link></Button>
              <Button asChild><Link to="/signup">Sign Up</Link></Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              My Negotiations
            </h1>
            <p className="text-muted-foreground mt-1">Manage your ongoing conversations</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-5 animate-pulse shadow-soft">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : negotiations.length === 0 ? (
            <div className="text-center py-20">
              <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">No negotiations yet</h2>
              <p className="text-muted-foreground mb-6">
                Start negotiating by clicking the "Negotiate" button on items or requests in the marketplace.
              </p>
              <Button asChild>
                <Link to="/marketplace">
                  <ShoppingBag className="w-4 h-4" />
                  Browse Marketplace
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {negotiations.map((neg) => (
                <button
                  key={neg.id}
                  onClick={() => openChat(neg)}
                  className="w-full bg-card rounded-2xl p-5 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-foreground truncate">{neg.itemTitle}</h3>
                        <Badge variant={neg.item_type === "item" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {neg.item_type === "item" ? <ShoppingBag className="w-3 h-3 mr-0.5" /> : <Search className="w-3 h-3 mr-0.5" />}
                          {neg.item_type === "item" ? "Item" : "Request"}
                        </Badge>
                        {neg.paid && <Badge variant="outline" className="text-[10px] shrink-0">Unlocked</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        with <span className="font-medium text-foreground">{neg.otherUserName}</span>
                      </p>
                      {neg.lastMessage && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{neg.lastMessage}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {(unreadByChat[neg.id] || 0) > 0 && (
                        <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold leading-none px-1 shadow-sm animate-in zoom-in-50 duration-200">
                          {unreadByChat[neg.id] > 99 ? "99+" : unreadByChat[neg.id]}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(neg.updated_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {neg.messageCount} msg{neg.messageCount !== 1 ? "s" : ""}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <NegotiationChat
        open={!!activeChatId}
        onOpenChange={(open) => { if (!open) setActiveChatId(null); }}
        negotiationId={activeChatId}
        itemTitle={activeChatTitle}
        otherUserName={activeChatUser}
      />
    </div>
  );
};

export default Negotiations;
