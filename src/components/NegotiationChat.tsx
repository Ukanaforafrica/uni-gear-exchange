import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, MessageCircle } from "lucide-react";
import type { Negotiation, NegotiationMessage } from "@/lib/types";
import { FREE_MESSAGE_LIMIT, CHAT_UNLOCK_PRICE } from "@/lib/types";

interface NegotiationChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string | null;
  itemTitle: string;
  otherUserName: string;
}

const NegotiationChat = ({
  open,
  onOpenChange,
  negotiationId,
  itemTitle,
  otherUserName,
}: NegotiationChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !negotiationId) return;

    const fetchData = async () => {
      const [negRes, msgRes] = await Promise.all([
        (supabase as any).from("negotiations").select("*").eq("id", negotiationId).single(),
        (supabase as any).from("negotiation_messages").select("*").eq("negotiation_id", negotiationId).order("created_at", { ascending: true }),
      ]);
      if (negRes.data) setNegotiation(negRes.data as Negotiation);
      if (msgRes.data) setMessages(msgRes.data as NegotiationMessage[]);
    };
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`neg-${negotiationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_messages",
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as NegotiationMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, negotiationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isLocked = !negotiation?.paid && messages.length >= FREE_MESSAGE_LIMIT;
  const remainingFree = Math.max(0, FREE_MESSAGE_LIMIT - messages.length);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !negotiationId || sending) return;

    if (isLocked) {
      toast({ title: "Chat locked", description: `Pay ₦${CHAT_UNLOCK_PRICE.toLocaleString()} to continue chatting.`, variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await (supabase as any).from("negotiation_messages").insert({
      negotiation_id: negotiationId,
      sender_id: user.id,
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleUnlock = async () => {
    // For now, mark as paid directly. Payment integration can be added later.
    toast({
      title: "Payment Required",
      description: `₦${CHAT_UNLOCK_PRICE.toLocaleString()} payment integration coming soon. Chat unlocked for now!`,
    });
    await (supabase as any).from("negotiations").update({ paid: true }).eq("id", negotiationId);
    setNegotiation((prev) => prev ? { ...prev, paid: true } : prev);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="truncate">{itemTitle}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Negotiating with {otherUserName}</p>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Start the conversation! 👋
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p>{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free message counter */}
        {!negotiation?.paid && (
          <div className="px-4 py-1.5 bg-muted/50 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {remainingFree > 0
                ? `${remainingFree} free message${remainingFree !== 1 ? "s" : ""} remaining`
                : "Free messages used up"}
            </p>
          </div>
        )}

        {/* Locked overlay */}
        {isLocked ? (
          <div className="p-4 border-t border-border bg-muted/30 text-center space-y-3">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">Chat limit reached</p>
            <p className="text-xs text-muted-foreground">
              Pay ₦{CHAT_UNLOCK_PRICE.toLocaleString()} to unlock unlimited messaging
            </p>
            <Button onClick={handleUnlock} className="w-full">
              Unlock Chat — ₦{CHAT_UNLOCK_PRICE.toLocaleString()}
            </Button>
          </div>
        ) : (
          <div className="p-3 border-t border-border flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[80px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NegotiationChat;
