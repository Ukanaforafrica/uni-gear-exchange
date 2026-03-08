import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationContextType {
  unreadCount: number;
  clearUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  clearUnread: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial unread count: messages in user's negotiations not sent by them
    const fetchUnread = async () => {
      // Get all negotiation IDs where user is buyer or seller
      const { data: negs } = await (supabase as any)
        .from("negotiations")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!negs || negs.length === 0) return;

      const negIds = negs.map((n: any) => n.id);

      // Count messages not sent by user in last 24 hours as "unread" approximation
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await (supabase as any)
        .from("negotiation_messages")
        .select("*", { count: "exact", head: true })
        .in("negotiation_id", negIds)
        .neq("sender_id", user.id)
        .gte("created_at", since);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Listen for new messages in real-time
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
  }, [user]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};
