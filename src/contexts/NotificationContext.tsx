import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationContextType {
  unreadCount: number;
  markAsSeen: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAsSeen: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const getLastSeenKey = (userId: string) => `notif_last_seen_${userId}`;

const getLastSeen = (userId: string): string => {
  const stored = localStorage.getItem(getLastSeenKey(userId));
  // Default to epoch if never seen
  return stored || new Date(0).toISOString();
};

const setLastSeen = (userId: string) => {
  localStorage.setItem(getLastSeenKey(userId), new Date().toISOString());
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    const { data: negs } = await (supabase as any)
      .from("negotiations")
      .select("id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (!negs || negs.length === 0) {
      setUnreadCount(0);
      return;
    }

    const negIds = negs.map((n: any) => n.id);
    const since = getLastSeen(user.id);

    const { count } = await (supabase as any)
      .from("negotiation_messages")
      .select("*", { count: "exact", head: true })
      .in("negotiation_id", negIds)
      .neq("sender_id", user.id)
      .gt("created_at", since);

    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
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
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, markAsSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};
