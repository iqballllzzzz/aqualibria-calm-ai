import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // ===== CREATE: Share a chat =====
    if (action === "create") {
      const { sessionId, title, messages, sharedByName } = body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: "Messages are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cleanMessages = messages.map((m: any) => ({
        role: m.role, content: m.content, timestamp: m.timestamp,
        fileName: m.fileName, isDualAgent: m.isDualAgent,
        perspectiveA: m.perspectiveA, perspectiveB: m.perspectiveB,
        agentAName: m.agentAName, agentBName: m.agentBName,
      }));
      const { data, error } = await supabase.from("shared_chats").insert({
        session_id: sessionId || "unknown",
        title: title || "Shared Chat",
        messages: cleanMessages,
        shared_by_name: sharedByName || "Anonymous",
      }).select("id").single();
      if (error) {
        return new Response(JSON.stringify({ error: "Failed to share chat" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, shareId: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET: Retrieve shared chat =====
    if (action === "get") {
      const { shareId } = body;
      if (!shareId) {
        return new Response(JSON.stringify({ error: "Share ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("shared_chats").select("*").eq("id", shareId).single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Shared chat not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, chat: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SYNC: Upload local data to cloud =====
    if (action === "sync") {
      const { firebaseUid, sessions, messages: syncMessages } = body;
      if (!firebaseUid || !sessions) {
        return new Response(JSON.stringify({ error: "Missing sync data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const s of sessions) {
        await supabase.from("chat_sessions").upsert({
          session_id: s.sessionId,
          firebase_uid: firebaseUid,
          title: s.title || "Chat",
          is_coding_partner: s.isCodingPartner || false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "session_id" });
      }
      if (syncMessages && syncMessages.length > 0) {
        // Delete old messages first to avoid duplicates, then insert fresh
        const sessionIds = [...new Set(syncMessages.map((m: any) => m.sessionId))];
        for (const sid of sessionIds) {
          await supabase.from("chat_messages").delete().eq("session_id", sid).eq("firebase_uid", firebaseUid);
        }
        const batch = syncMessages.slice(0, 500).map((m: any) => ({
          session_id: m.sessionId,
          firebase_uid: firebaseUid,
          role: m.role,
          content: (m.content || "").slice(0, 8000),
          image_url: m.imageUrl || null,
          created_at: m.createdAt || new Date().toISOString(),
        }));
        await supabase.from("chat_messages").insert(batch);
      }
      return new Response(JSON.stringify({ success: true, synced: sessions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== RESTORE: Download cloud data to local =====
    if (action === "restore") {
      const { firebaseUid } = body;
      if (!firebaseUid) {
        return new Response(JSON.stringify({ error: "Missing firebaseUid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get sessions
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("firebase_uid", firebaseUid)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ success: true, sessions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get messages for these sessions
      const sessionIds = sessions.map(s => s.session_id);
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true })
        .limit(1000);

      // Group messages by session
      const messagesBySession: Record<string, any[]> = {};
      for (const m of (messages || [])) {
        if (!messagesBySession[m.session_id]) messagesBySession[m.session_id] = [];
        messagesBySession[m.session_id].push(m);
      }

      const result = sessions.map(s => ({
        ...s,
        messages: messagesBySession[s.session_id] || [],
      }));

      return new Response(JSON.stringify({ success: true, sessions: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Share chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
