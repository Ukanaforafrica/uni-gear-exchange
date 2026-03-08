import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Negotiation } from "@/lib/types";

export const useNegotiation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeNegotiationId, setActiveNegotiationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("");
  const [chatOtherUser, setChatOtherUser] = useState("");

  const startNegotiation = async ({
    itemId,
    itemRequestId,
    itemType,
    sellerId,
    itemTitle,
  }: {
    itemId?: string;
    itemRequestId?: string;
    itemType: "item" | "request";
    sellerId: string;
    itemTitle: string;
  }) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to negotiate.", variant: "destructive" });
      return;
    }

    if (user.id === sellerId) {
      toast({ title: "Can't negotiate", description: "You can't negotiate on your own listing.", variant: "destructive" });
      return;
    }

    // Check for existing negotiation
    let query = (supabase as any)
      .from("negotiations")
      .select("*")
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId);

    if (itemType === "item") {
      query = query.eq("item_id", itemId);
    } else {
      query = query.eq("item_request_id", itemRequestId);
    }

    const { data: existing } = await query.limit(1);

    let negotiationId: string;

    if (existing && existing.length > 0) {
      negotiationId = existing[0].id;
    } else {
      const { data, error } = await (supabase as any).from("negotiations").insert({
        item_id: itemId || null,
        item_request_id: itemRequestId || null,
        item_type: itemType,
        buyer_id: user.id,
        seller_id: sellerId,
      }).select("id").single();

      if (error) {
        toast({ title: "Error", description: "Failed to start negotiation", variant: "destructive" });
        return;
      }
      negotiationId = data.id;
    }

    // Get seller name
    const { data: sellerProfile } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", sellerId)
      .single();

    setActiveNegotiationId(negotiationId);
    setChatTitle(itemTitle);
    setChatOtherUser(sellerProfile?.full_name || "Seller");
    setChatOpen(true);
  };

  return {
    chatOpen,
    setChatOpen,
    activeNegotiationId,
    chatTitle,
    chatOtherUser,
    startNegotiation,
  };
};
