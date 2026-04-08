import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChatHistory, saveChatSession } from "@/lib/storage";
import type { User } from "@/lib/firebase";

const SYNC_INTERVAL = 60_000;

export function useCloudSync(user: User | null) {
  const lastSync = useRef(0);
  const restored = useRef(false);

  useEffect(() => {
    if (!user) { restored.current = false; return; }

    // Restore data from cloud on login if local is empty
    const restoreFromCloud = async () => {
      if (restored.current) return;
      restored.current = true;

      const localHistory = getChatHistory();
      if (localHistory.length > 0) return; // Already have local data

      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/share-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "restore", firebaseUid: user.uid }),
        });
        const data = await response.json();
        if (data.success && data.sessions?.length > 0) {
          for (const s of data.sessions) {
            saveChatSession({
              id: s.session_id,
              title: s.title,
              messages: (s.messages || []).map((m: any) => ({
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
                id: m.id,
                imageUrl: m.image_url || undefined,
              })),
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at),
              isCodingPartner: s.is_coding_partner || false,
            });
          }
          console.log(`Restored ${data.sessions.length} sessions from cloud`);
          window.dispatchEvent(new Event("cloud-sync-restored"));
        }
      } catch (e) {
        console.warn("Cloud restore failed:", e);
      }
    };

    restoreFromCloud();

    const sync = async () => {
      const now = Date.now();
      if (now - lastSync.current < 30_000) return;
      lastSync.current = now;

      try {
        const history = getChatHistory();
        const recentSessions = history.slice(0, 20);

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

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
                content: m.content.slice(0, 4000),
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

    const initialTimer = setTimeout(sync, 10_000);
    const interval = setInterval(sync, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user]);
}
