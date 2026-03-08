import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Get all available API keys for rotation
function getApiKeys(): string[] {
  const keys: string[] = [];
  const k1 = Deno.env.get("GEMINI_API_KEY");
  const k2 = Deno.env.get("GEMINI_API_KEY_2");
  const k3 = Deno.env.get("GEMINI_API_KEY_3");
  if (k1) keys.push(k1);
  if (k2) keys.push(k2);
  if (k3) keys.push(k3);
  return keys;
}

async function tryTTS(apiKey: string, cleanText: string, geminiVoice: string): Promise<Response> {
  const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  return fetch(ttsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: cleanText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: geminiVoice },
          },
        },
      },
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      console.error("No GEMINI_API_KEY configured");
      return new Response(JSON.stringify({ error: "API key not configured", fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice = "aurora" } = await req.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.slice(0, 3000);
    const geminiVoice = VOICE_MAP[voice] || VOICE_MAP.aurora;
    console.log(`TTS: voice=${voice}->${geminiVoice}, len=${cleanText.length}, keys=${apiKeys.length}`);

    // Try each API key in rotation
    for (let i = 0; i < apiKeys.length; i++) {
      try {
        console.log(`Trying API key ${i + 1}/${apiKeys.length}...`);
        const response = await tryTTS(apiKeys[i], cleanText, geminiVoice);

        if (response.status === 429 || response.status === 403) {
          const errText = await response.text();
          console.warn(`Key ${i + 1} rate limited/forbidden: ${response.status} ${errText.slice(0, 200)}`);
          continue; // Try next key
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Key ${i + 1} error: ${response.status} ${errText.slice(0, 300)}`);
          continue;
        }

        const data = await response.json();
        const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (audioPart && audioPart.data) {
          const mimeType = audioPart.mimeType || "audio/wav";
          const audioDataUrl = `data:${mimeType};base64,${audioPart.data}`;
          console.log(`TTS success with key ${i + 1}: ${mimeType}, len=${audioPart.data.length}`);
          return new Response(JSON.stringify({ success: true, audioUrl: audioDataUrl, mimeType }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.warn(`Key ${i + 1}: no audio in response`);
      } catch (keyError) {
        console.error(`Key ${i + 1} exception:`, keyError);
        continue;
      }
    }

    // All keys failed
    console.error("All API keys exhausted for TTS");
    return new Response(JSON.stringify({ error: "All TTS keys exhausted", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
