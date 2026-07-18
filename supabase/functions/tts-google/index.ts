import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Nexray public API (no key required) — see https://api.nexray.eu.cc/category/ai
const NEXRAY_TTS_URL = "https://api.nexray.eu.cc/ai/gemini-tts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text
      .replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .slice(0, 1000);

    const url = `${NEXRAY_TTS_URL}?text=${encodeURIComponent(cleanText)}`;
    console.log(`TTS (Nexray): len=${cleanText.length}`);

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`Nexray TTS error: ${response.status} ${errText.slice(0, 300)}`);
      return new Response(JSON.stringify({ error: "TTS provider error", fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // Case 1: Nexray streams raw audio bytes directly.
    if (contentType.startsWith("audio/")) {
      const buf = await response.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const audioUrl = `data:${contentType};base64,${b64}`;
      console.log(`TTS success (raw audio): ${contentType}, ${bytes.length} bytes`);
      return new Response(JSON.stringify({ success: true, audioUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Case 2: Nexray returns JSON with the audio URL/data nested somewhere.
    const raw = await response.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* not JSON, handled below */ }

    if (data) {
      const audioUrl =
        data.url || data.result?.url || data.data?.url ||
        data.audio || data.result?.audio || data.data?.audio ||
        (typeof data.result === "string" ? data.result : undefined) ||
        (typeof data.data === "string" ? data.data : undefined);

      if (typeof audioUrl === "string" && audioUrl.length > 0) {
        console.log(`TTS success (JSON), url head: ${audioUrl.slice(0, 60)}`);
        return new Response(JSON.stringify({ success: true, audioUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.error(`Nexray TTS: unrecognized response shape: ${raw.slice(0, 300)}`);
    return new Response(JSON.stringify({
      error: "Unrecognized TTS response from provider",
      fallback: true,
      raw: raw.slice(0, 300),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
