// Fullstack agent orchestration:
//   1) BigPickle (OpenCode) drafts an implementation plan + initial files
//   2) OpenCode (same endpoint, coder persona) refines / expands the code
// Streams progress as SSE so the client can render Progressive Thinking states.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENCODE_URL = "https://opencode.aicoderlab.com/v1/chat/completions";
const OPENCODE_KEY = Deno.env.get("OPENCODE_API_KEY") || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function callOpenCode(system: string, user: string, model = "bigpickle") {
  if (!OPENCODE_KEY) throw new Error("opencode_not_configured");
  const r = await fetch(OPENCODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENCODE_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.4,
    }),
  });
  if (!r.ok) throw new Error(`opencode_${r.status}`);
  const j = await r.json();
  return j?.choices?.[0]?.message?.content || "";
}

async function callOpenRouter(system: string, user: string) {
  if (!OPENROUTER_KEY) throw new Error("openrouter_not_configured");
  const r = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENROUTER_KEY}` },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`openrouter_${r.status}`);
  const j = await r.json();
  return j?.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { task } = await req.json().catch(() => ({ task: "" }));
  if (!task) return new Response(JSON.stringify({ error: "missing_task" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (ev: string, d: unknown) => controller.enqueue(enc.encode(sseEvent(ev, d)));

      let plan = "";
      // ── Stage 1: BigPickle plan ───────────────────────────────────────
      emit("stage", { id: "bigpickle", status: "active", label: "BigPickle: menyusun rencana" });
      try {
        plan = await callOpenCode(
          "You are BigPickle, a senior software architect. Produce a concise, numbered implementation plan and a list of files to create/modify. No prose fluff.",
          task, "bigpickle"
        );
        emit("stage", { id: "bigpickle", status: "ok" });
        emit("plan", { plan });
      } catch (e) {
        emit("stage", { id: "bigpickle", status: "failed", detail: String(e) });
        // Try OpenRouter to salvage a plan
        try {
          emit("stage", { id: "openrouter-plan", status: "active", label: "OpenRouter fallback" });
          plan = await callOpenRouter(
            "You are a senior software architect. Provide a concise implementation plan.", task
          );
          emit("stage", { id: "openrouter-plan", status: "ok" });
          emit("plan", { plan });
        } catch (e2) {
          emit("stage", { id: "openrouter-plan", status: "failed", detail: String(e2) });
          emit("done", { ok: false, reason: "all_planners_failed" });
          controller.close(); return;
        }
      }

      // ── Stage 2: OpenCode implementation ──────────────────────────────
      emit("stage", { id: "opencode", status: "active", label: "OpenCode: menulis kode" });
      try {
        const impl = await callOpenCode(
          "You are OpenCode, a precise implementation engine. Given a plan, output the full file contents in fenced code blocks with the file path on the first line as a comment (e.g. // src/foo.ts). Do not omit code.",
          `TASK:\n${task}\n\nPLAN:\n${plan}`,
          "opencode"
        );
        emit("stage", { id: "opencode", status: "ok" });
        emit("files", { content: impl });
        emit("done", { ok: true });
      } catch (e) {
        emit("stage", { id: "opencode", status: "failed", detail: String(e) });
        emit("done", { ok: false, reason: "implementation_failed" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
});