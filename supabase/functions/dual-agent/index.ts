import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

    const { message, conversationHistory = [], memoryContext = "" } = await req.json();

    // First, check if this topic warrants dual perspectives
    const classifyResponse = await fetch(GATEWAY_URL, {
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
            content: `You are a classifier. Determine if this user message requires TWO different perspectives to give a balanced answer. Topics that need dual perspectives: ethical dilemmas, controversial topics, life decisions, career choices, philosophical questions, debates, comparisons of approaches/technologies, relationship advice, moral questions. Simple questions, greetings, factual queries, coding questions do NOT need dual perspectives. Respond with ONLY "DUAL" or "SINGLE".`
          },
          { role: "user", content: message }
        ],
      }),
    });

    if (!classifyResponse.ok) {
      return new Response(JSON.stringify({ error: "Classification failed", needsDual: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classifyData = await classifyResponse.json();
    const classification = classifyData.choices?.[0]?.message?.content?.trim() || "SINGLE";
    const needsDual = classification.includes("DUAL");

    if (!needsDual) {
      return new Response(JSON.stringify({ needsDual: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate two perspectives in parallel
    const agentAPromise = fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are "Perspective A" - the OPTIMISTIC, PROGRESSIVE agent of AquaLibriaAI. You tend to see opportunities, innovation, and positive possibilities. You argue FOR change, FOR taking risks, FOR the unconventional path. Be thoughtful, provide concrete reasoning, and be persuasive but respectful. Keep your response focused and under 300 words. Created by M Iqbal.S. ${memoryContext ? `User context: ${memoryContext}` : ""}`
          },
          ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message }
        ],
      }),
    });

    const agentBPromise = fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are "Perspective B" - the CAUTIOUS, ANALYTICAL agent of AquaLibriaAI. You tend to see risks, practicalities, and careful considerations. You argue FOR caution, FOR proven methods, FOR the safe path. Be thoughtful, provide concrete reasoning, and be persuasive but respectful. Keep your response focused and under 300 words. Created by M Iqbal.S. ${memoryContext ? `User context: ${memoryContext}` : ""}`
          },
          ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message }
        ],
      }),
    });

    const [agentARes, agentBRes] = await Promise.all([agentAPromise, agentBPromise]);

    if (!agentARes.ok || !agentBRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to get dual perspectives", needsDual: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [agentAData, agentBData] = await Promise.all([agentARes.json(), agentBRes.json()]);

    const perspectiveA = agentAData.choices?.[0]?.message?.content || "Could not generate perspective.";
    const perspectiveB = agentBData.choices?.[0]?.message?.content || "Could not generate perspective.";

    return new Response(JSON.stringify({
      needsDual: true,
      perspectiveA,
      perspectiveB,
      agentAName: "Optimist",
      agentBName: "Realist",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Dual agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", needsDual: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
