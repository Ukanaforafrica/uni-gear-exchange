import { useEffect, useRef, useState, useCallback } from "react";
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
import { Send, Lock, MessageCircle, Image, Mic, Video, Square, Loader2 } from "lucide-react";
import MeetupProposal from "@/components/MeetupProposal";
import type { Negotiation, NegotiationMessage, MessageType } from "@/lib/types";
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
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as NegotiationMessage).id)) return prev;
            return [...prev, payload.new as NegotiationMessage];
          });
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

  const uploadMedia = async (file: Blob, ext: string): Promise<string | null> => {
    const path = `${negotiationId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMediaMessage = async (mediaUrl: string, type: MessageType, caption?: string) => {
    if (!user || !negotiationId) return;
    if (isLocked) {
      toast({ title: "Chat locked", description: `Pay ₦${CHAT_UNLOCK_PRICE.toLocaleString()} to continue.`, variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("negotiation_messages").insert({
      negotiation_id: negotiationId,
      sender_id: user.id,
      message: caption || "",
      message_type: type,
      media_url: mediaUrl,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send", variant: "destructive" });
    }
  };

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
      message_type: "text",
      media_url: "",
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: MessageType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || (type === "image" ? "jpg" : "mp4");
    const url = await uploadMedia(file, ext);
    if (url) await sendMediaMessage(url, type);
    setUploading(false);
    e.target.value = "";
  };

  const toggleRecording = useCallback(async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);
        const url = await uploadMedia(blob, "webm");
        if (url) await sendMediaMessage(url, "voice");
        setUploading(false);
      };

      recorder.start();
      setRecording(true);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to send voice notes.", variant: "destructive" });
    }
  }, [recording, negotiationId, user]);

  const handleUnlock = async () => {
    toast({
      title: "Payment Required",
      description: `₦${CHAT_UNLOCK_PRICE.toLocaleString()} payment integration coming soon. Chat unlocked for now!`,
    });
    await (supabase as any).from("negotiations").update({ paid: true }).eq("id", negotiationId);
    setNegotiation((prev) => (prev ? { ...prev, paid: true } : prev));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessageContent = (msg: NegotiationMessage) => {
    const type = msg.message_type || "text";

    if (type === "image" && msg.media_url) {
      return (
        <div>
          <img
            src={msg.media_url}
            alt="Shared image"
            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
            onClick={() => window.open(msg.media_url, "_blank")}
          />
          {msg.message && <p className="mt-1.5 text-sm">{msg.message}</p>}
        </div>
      );
    }

    if (type === "voice" && msg.media_url) {
      return (
        <div className="min-w-[180px]">
          <audio controls src={msg.media_url} className="max-w-full h-8" />
        </div>
      );
    }

    if (type === "video" && msg.media_url) {
      return (
        <div>
          <video
            controls
            src={msg.media_url}
            className="rounded-lg max-w-full max-h-48"
          />
          {msg.message && <p className="mt-1.5 text-sm">{msg.message}</p>}
        </div>
      );
    }

    return <p>{msg.message}</p>;
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
                  {renderMessageContent(msg)}
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

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "video")}
        />

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
          <div className="p-3 border-t border-border space-y-2">
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading media...
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* Media buttons */}
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Send image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 shrink-0 ${recording ? "text-destructive bg-destructive/10" : ""}`}
                  onClick={toggleRecording}
                  disabled={uploading}
                  title={recording ? "Stop recording" : "Record voice note"}
                >
                  {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  title="Send video"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button size="icon" className="shrink-0" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {recording && (
              <p className="text-xs text-destructive text-center animate-pulse">
                🎙️ Recording... tap stop to send
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NegotiationChat;
