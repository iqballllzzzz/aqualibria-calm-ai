import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Voice configurations mapped to Gemini TTS-compatible voice descriptions
const VOICE_CONFIGS: Record<string, { name: string; language: string; gender: string }> = {
  aurora: { name: "Aurora", language: "en-US", gender: "female" },
  river: { name: "River", language: "en-US", gender: "male" },
  luna: { name: "Luna", language: "en-US", gender: "female" },
  ember: { name: "Ember", language: "en-US", gender: "female" },
  atlas: { name: "Atlas", language: "en-US", gender: "male" },
  iris: { name: "Iris", language: "en-US", gender: "female" },
  nova: { name: "Nova", language: "en-US", gender: "female" },
  onyx: { name: "Onyx", language: "en-US", gender: "male" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
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

    const voiceConfig = VOICE_CONFIGS[voice] || VOICE_CONFIGS.aurora;
    const cleanText = text.slice(0, 1500);

    // Use Gemini to generate spoken audio via the image model that supports audio output
    // We use a creative prompt to get natural-sounding speech
    const ttsPrompt = `You are a voice actor named ${voiceConfig.name}. Read this text aloud naturally and expressively, as if speaking to a friend. Use a ${voiceConfig.gender} voice. The text to read: "${cleanText}"`;

    // Use the gateway to generate speech-like text response
    // Since direct audio generation isn't available, we'll use browser TTS with enhanced voice selection
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a TTS preprocessor. Clean and optimize the following text for natural speech synthesis. Remove markdown formatting, code blocks, URLs, and special characters. Break long sentences into shorter ones. Add natural pauses with commas. Output ONLY the cleaned text, nothing else.`
          },
          { role: "user", content: cleanText }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("TTS preprocessing error:", response.status, errText);
      // Return the original text for browser TTS
      return new Response(JSON.stringify({ 
        success: true, 
        cleanedText: cleanText,
        voice: voiceConfig,
        method: "browser_tts"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const cleanedText = data.choices?.[0]?.message?.content || cleanText;

    return new Response(JSON.stringify({ 
      success: true, 
      cleanedText: cleanedText.slice(0, 2000),
      voice: voiceConfig,
      method: "browser_tts"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
