import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map custom voice names to Gemini TTS prebuilt voices
const VOICE_MAP: Record<string, string> = {
  aurora: "Aoede",
  river: "Charon",
  luna: "Leda",
  ember: "Kore",
  atlas: "Orus",
  iris: "Zephyr",
  nova: "Puck",
  onyx: "Fenrir",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice = "aurora" } = await req.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.slice(0, 3000);
    const geminiVoice = VOICE_MAP[voice] || VOICE_MAP.aurora;

    // Use Gemini TTS model directly
    const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: geminiVoice,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini TTS error:", response.status, errText);
      return new Response(JSON.stringify({ 
        error: `TTS API error: ${response.status}`,
        fallback: true,
      }), {
        status: 200, // Return 200 so client can fallback gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract audio data from response
    const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (audioPart && audioPart.data) {
      const mimeType = audioPart.mimeType || "audio/wav";
      const audioDataUrl = `data:${mimeType};base64,${audioPart.data}`;
      
      return new Response(JSON.stringify({ 
        success: true,
        audioUrl: audioDataUrl,
        mimeType,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No audio in response
    return new Response(JSON.stringify({ 
      error: "No audio generated",
      fallback: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      fallback: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
