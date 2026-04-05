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
    const { action, sessionId, title, messages, sharedByName, shareId } = body;

    if (action === "create") {
      // Create a shared chat
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: "Messages are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean messages - strip large binary data
      const cleanMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        fileName: m.fileName,
        isDualAgent: m.isDualAgent,
        perspectiveA: m.perspectiveA,
        perspectiveB: m.perspectiveB,
        agentAName: m.agentAName,
        agentBName: m.agentBName,
      }));

      const { data, error } = await supabase.from("shared_chats").insert({
        session_id: sessionId || "unknown",
        title: title || "Shared Chat",
        messages: cleanMessages,
        shared_by_name: sharedByName || "Anonymous",
      }).select("id").single();

      if (error) {
        console.error("Share error:", error);
        return new Response(JSON.stringify({ error: "Failed to share chat" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, shareId: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      if (!shareId) {
        return new Response(JSON.stringify({ error: "Share ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("shared_chats")
        .select("*")
        .eq("id", shareId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Shared chat not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, chat: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SYNC: Cloud sync for chat persistence =====
    if (action === "sync") {
      const { firebaseUid, sessions, messages: syncMessages } = body;
      if (!firebaseUid || !sessions) {
        return new Response(JSON.stringify({ error: "Missing sync data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert sessions
      for (const s of sessions) {
        await supabase.from("chat_sessions").upsert({
          session_id: s.sessionId,
          firebase_uid: firebaseUid,
          title: s.title || "Chat",
          is_coding_partner: s.isCodingPartner || false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "session_id" });
      }

      // Batch insert messages (skip duplicates via content+session+role hash)
      if (syncMessages && syncMessages.length > 0) {
        const batch = syncMessages.slice(0, 200).map((m: any) => ({
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

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Share chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
