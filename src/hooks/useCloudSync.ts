import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChatHistory } from "@/lib/storage";
import type { User } from "@/lib/firebase";

const SYNC_INTERVAL = 60_000; // 1 minute

export function useCloudSync(user: User | null) {
  const lastSync = useRef(0);

  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      const now = Date.now();
      if (now - lastSync.current < 30_000) return; // debounce
      lastSync.current = now;

      try {
        const history = getChatHistory();
        const recentSessions = history.slice(0, 20); // sync last 20

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Use edge function with service role to bypass RLS
        await fetch(`${SUPABASE_URL}/functions/v1/share-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "sync",
            firebaseUid: user.uid,
            sessions: recentSessions.map(s => ({
              sessionId: s.id,
              title: s.title,
              messageCount: s.messages.length,
              updatedAt: s.updatedAt,
              isCodingPartner: s.isCodingPartner || false,
            })),
            messages: recentSessions.flatMap(s =>
              s.messages.slice(-50).map(m => ({
                sessionId: s.id,
                role: m.role,
                content: m.content.slice(0, 4000), // limit size
                imageUrl: m.imageUrl || null,
                createdAt: m.timestamp,
              }))
            ),
          }),
        });
      } catch (e) {
        console.warn("Cloud sync failed:", e);
      }
    };

    // Initial sync after 10s
    const initialTimer = setTimeout(sync, 10_000);
    const interval = setInterval(sync, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user]);
}
