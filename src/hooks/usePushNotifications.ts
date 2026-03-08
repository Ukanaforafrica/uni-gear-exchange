import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SW_PATH = "/sw.js";

export function usePushNotifications() {
  const { user } = useAuth();
  const subscribedRef = useRef(false);

  const getVapidKey = useCallback(async (): Promise<string | null> => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-notifications?action=vapid-key`
      );
      const data = await res.json();
      return data.publicKey || null;
    } catch (err) {
      console.error("Failed to get VAPID key:", err);
      return null;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || subscribedRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Push notification permission denied");
          return;
        }

        // Get VAPID key
        const vapidKey = await getVapidKey();
        if (!vapidKey) {
          console.error("No VAPID key available");
          return;
        }

        // Convert base64url to Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Send subscription to server
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const subJson = subscription.toJSON();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "subscribe",
            subscription: {
              endpoint: subJson.endpoint,
              keys: subJson.keys,
            },
          }),
        }
      );

      subscribedRef.current = true;
      console.log("Push subscription registered");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }, [user, getVapidKey]);

  useEffect(() => {
    if (user) {
      subscribe();
    }
  }, [user, subscribe]);

  return { subscribe };
}

// Send a push notification to a specific user via the edge function
export async function sendPushToUser(
  recipientId: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const session = (await supabase.auth.getSession()).data.session;

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/push-notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: "send",
          recipientId,
          title,
          body,
          url,
        }),
      }
    );
  } catch (err) {
    console.error("Failed to send push:", err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
