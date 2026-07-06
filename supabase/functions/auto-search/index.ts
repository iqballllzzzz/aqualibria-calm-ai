// Auto-search tool. Tries Google Custom Search when configured, then falls
// back to a Gemini-powered "grounded" answer, then a plain "no-tool" reply.
// Response shape is stable so the caller can degrade gracefully.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface SearchHit { title: string; url: string; snippet: string }
interface Payload { ok: boolean; provider: "google" | "gemini" | "none"; hits: SearchHit[]; error?: string }

const GEMINI_KEY = Deno.env.get("GEMINI_FREE_FLASH_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
const GOOGLE_KEY = Deno.env.get("GOOGLE_SEARCH_KEY") || "";
const GOOGLE_CX  = Deno.env.get("GOOGLE_SEARCH_CX")  || "";

async function googleSearch(q: string): Promise<SearchHit[]> {
  if (!GOOGLE_KEY || !GOOGLE_CX) throw new Error("google_not_configured");
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&num=6`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`google_${r.status}`);
  const j = await r.json();
  return (j.items || []).map((it: any) => ({
    title: it.title, url: it.link, snippet: it.snippet || "",
  }));
}

async function geminiGrounded(q: string): Promise<SearchHit[]> {
  if (!GEMINI_KEY) throw new Error("gemini_not_configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: `Give me 5 short bullet references (title | url | 1-line snippet) about: ${q}` }] }],
    tools: [{ google_search: {} }],
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`gemini_${r.status}`);
  const j = await r.json();
  const text: string = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") || "";
  const hits: SearchHit[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(?:[-*]\s*)?(.+?)\s*[|—-]\s*(https?:\/\/\S+)\s*[|—-]?\s*(.*)$/);
    if (m) hits.push({ title: m[1].trim(), url: m[2].trim(), snippet: (m[3] || "").trim() });
  }
  return hits.slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "missing_query", provider: "none", hits: [] } satisfies Payload),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Google first
    try {
      const hits = await googleSearch(query);
      const body: Payload = { ok: true, provider: "google", hits };
      return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (_) { /* fall through */ }

    // Fallback: Gemini grounded
    try {
      const hits = await geminiGrounded(query);
      const body: Payload = { ok: true, provider: "gemini", hits };
      return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (_) { /* fall through */ }

    // Total failure – client should proceed WITHOUT search
    const body: Payload = { ok: false, provider: "none", hits: [], error: "all_providers_failed" };
    return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, provider: "none", hits: [], error: String(err) } satisfies Payload),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});