import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "").trim();
    const claims = decodeJwtPayload(token);
    if (claims?.role !== "authenticated" || claims?.aud !== "authenticated") return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").trim();
    const modelKey = String(body.model ?? "qwen3-coder");
    const quality = body.quality === "low" ? "low" : "high";
    const plan = ["junior", "senior", "superior", "nigown"].includes(String(body.plan)) ? String(body.plan) : "junior";

    if (!prompt) {
      return json({ error: "prompt required" }, 400);
    }
    if (prompt.length > 20000) return json({ error: "prompt too long" }, 413);

    const { data: limit, error: limitErr } = await admin.rpc("check_llamacoder_rate_limit", { _user_id: userData.user.id, _plan: plan });
    if (limitErr) return json({ error: limitErr.message }, 500);
    if (!limit?.allowed) return json({ error: "Terlalu banyak request. Coba lagi sebentar.", reason: limit.reason, retry_after_seconds: limit.retry_after_seconds }, 429);

    const model = MODELS[modelKey] ?? MODELS["qwen3-coder"];

    // Step 1: create chat
    const createResp = await fetch(`${BASE}/create-chat`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify({ prompt, model, quality }),
    });
    if (!createResp.ok) {
      const t = await createResp.text();
      return json({ error: `create-chat ${createResp.status}: ${t.slice(0, 300)}` }, 502);
    }
    const t = await createResp.json();
    if (!t?.lastMessageId) {
      return json({ error: "no lastMessageId from llamacoder" }, 502);
    }

    // Step 2: get completion stream
    const streamResp = await fetch(`${BASE}/get-next-completion-stream-promise`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify({ messageId: t.lastMessageId, model }),
    });
    if (!streamResp.ok) {
      const tt = await streamResp.text();
      return json({ error: `stream ${streamResp.status}: ${tt.slice(0, 300)}` }, 502);
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
      return json({ error: "empty result from llamacoder" }, 502);
    }

    return json({ success: true, code: result, model: modelKey, rateLimit: limit });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});