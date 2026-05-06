// LlamaCoder edge function — proxies Together AI's LlamaCoder API
// Models: deepseek-v3.1, qwen3-coder, kimi-k2.1, glm-4.6

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELS: Record<string, string> = {
  "deepseek-v3.1": "deepseek-ai/DeepSeek-V3.1",
  "qwen3-coder": "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
  "kimi-k2.1": "moonshotai/Kimi-K2-Instruct-0905",
  "glm-4.6": "zai-org/GLM-4.6",
};

const BASE = "https://llamacoder.together.ai/api";
const COMMON_HEADERS = {
  origin: "https://llamacoder.together.ai",
  referer: "https://llamacoder.together.ai/",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  "content-type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").trim();
    const modelKey = String(body.model ?? "qwen3-coder");
    const quality = body.quality === "low" ? "low" : "high";

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = MODELS[modelKey] ?? MODELS["qwen3-coder"];

    // Step 1: create chat
    const createResp = await fetch(`${BASE}/create-chat`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify({ prompt, model, quality }),
    });
    if (!createResp.ok) {
      const t = await createResp.text();
      return new Response(JSON.stringify({ error: `create-chat ${createResp.status}: ${t.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const t = await createResp.json();
    if (!t?.lastMessageId) {
      return new Response(JSON.stringify({ error: "no lastMessageId from llamacoder" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: get completion stream
    const streamResp = await fetch(`${BASE}/get-next-completion-stream-promise`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify({ messageId: t.lastMessageId, model }),
    });
    if (!streamResp.ok) {
      const tt = await streamResp.text();
      return new Response(JSON.stringify({ error: `stream ${streamResp.status}: ${tt.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const raw = await streamResp.text();
    const result = raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean)
      .map((line: any) => line?.choices?.[0]?.text ?? "")
      .join("");

    if (!result) {
      return new Response(JSON.stringify({ error: "empty result from llamacoder" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, code: result, model: modelKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});