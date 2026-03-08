import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationContextType {
  unreadCount: number;
  unreadByChat: Record<string, number>;
  markAsSeen: () => void;
  markChatAsSeen: (negotiationId: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  unreadByChat: {},
  markAsSeen: () => {},
  markChatAsSeen: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const getLastSeenKey = (userId: string) => `notif_last_seen_${userId}`;
const getChatLastSeenKey = (userId: string, negId: string) => `notif_chat_seen_${userId}_${negId}`;

const getLastSeen = (userId: string): string => {
  return localStorage.getItem(getLastSeenKey(userId)) || new Date(0).toISOString();
};

const getChatLastSeen = (userId: string, negId: string): string => {
  return localStorage.getItem(getChatLastSeenKey(userId, negId)) || getLastSeen(userId);
};

const setLastSeen = (userId: string) => {
  localStorage.setItem(getLastSeenKey(userId), new Date().toISOString());
};

const setChatLastSeen = (userId: string, negId: string) => {
  localStorage.setItem(getChatLastSeenKey(userId, negId), new Date().toISOString());
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByChat, setUnreadByChat] = useState<Record<string, number>>({});

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    const { data: negs } = await (supabase as any)
      .from("negotiations")
      .select("id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (!negs || negs.length === 0) {
      setUnreadCount(0);
      setUnreadByChat({});
      return;
    }

    const globalSince = getLastSeen(user.id);
    let totalUnread = 0;
    const perChat: Record<string, number> = {};

    await Promise.all(
      negs.map(async (n: any) => {
        const chatSince = getChatLastSeen(user.id, n.id);
        const since = chatSince > globalSince ? chatSince : globalSince;

        // Count unread messages
        const { count: msgCount } = await (supabase as any)
          .from("negotiation_messages")
          .select("*", { count: "exact", head: true })
          .eq("negotiation_id", n.id)
          .neq("sender_id", user.id)
          .gt("created_at", since);

        // Count unread meetup proposals (proposed by the other user or updated after last seen)
        const { count: meetupCount } = await (supabase as any)
          .from("meetup_proposals")
          .select("*", { count: "exact", head: true })
          .eq("negotiation_id", n.id)
          .neq("proposed_by", user.id)
          .gt("created_at", since);

        // Count meetup acceptance updates (where the other party accepted after last seen)
        const { count: meetupUpdateCount } = await (supabase as any)
          .from("meetup_proposals")
          .select("*", { count: "exact", head: true })
          .eq("negotiation_id", n.id)
          .gt("updated_at", since)
          .neq("proposed_by", user.id)
          .or("buyer_accepted.eq.true,seller_accepted.eq.true");

        const c = (msgCount || 0) + (meetupCount || 0) + (meetupUpdateCount || 0);
        perChat[n.id] = c;
        totalUnread += c;
      })
    );

    setUnreadByChat(perChat);
    setUnreadCount(totalUnread);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUnreadByChat({});
      return;
    }

    fetchUnread();

    const channel = supabase
      .channel("notification-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_messages",
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
            setUnreadByChat((prev) => ({
              ...prev,
              [msg.negotiation_id]: (prev[msg.negotiation_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnread]);

  const markAsSeen = useCallback(() => {
    if (!user) return;
    setLastSeen(user.id);
    setUnreadCount(0);
    setUnreadByChat({});
  }, [user]);

  const markChatAsSeen = useCallback((negotiationId: string) => {
    if (!user) return;
    setChatLastSeen(user.id, negotiationId);
    setUnreadByChat((prev) => {
      const chatCount = prev[negotiationId] || 0;
      setUnreadCount((total) => Math.max(0, total - chatCount));
      return { ...prev, [negotiationId]: 0 };
    });
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, unreadByChat, markAsSeen, markChatAsSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};
