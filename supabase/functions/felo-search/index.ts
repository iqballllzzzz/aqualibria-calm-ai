// Felo AI search proxy — calls Felo's connection endpoint then runs an MQTT
// ask_question session, returning {text, sources}. Timeouts at 25s.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import mqtt from "npm:mqtt@5.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FELO_API = "https://api.felo.ai";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function rand(len: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getConnection() {
  const visitorId = uuid();
  const res = await fetch(`${FELO_API}/search/user/connection?client_id=${visitorId}`, {
    headers: {
      accept: "*/*",
      cookie: `visitor_id=${visitorId}`,
      Referer: "https://felo.ai/",
    },
  });
  if (!res.ok) throw new Error(`felo connection ${res.status}`);
  return await res.json();
}

function ask(query: string): Promise<{ text: string; sources: any[] }> {
  return new Promise(async (resolve, reject) => {
    let client: any = null;
    const timer = setTimeout(() => {
      try { client?.end(true); } catch (_) {}
      reject(new Error("felo_timeout"));
    }, 25000);

    try {
      const conn = await getConnection();
      client = mqtt.connect(conn.ws_url, {
        clientId: conn.client_id,
        username: conn.username,
        password: conn.password,
        protocolVersion: 5,
        connectTimeout: 15000,
      });

      const result = { text: "", sources: [] as any[] };

      client.on("connect", () => {
        client.subscribe(conn.sub_topic);
        client.publish(
          conn.pub_topic,
          JSON.stringify({
            event_name: "ask_question",
            data: {
              process_id: rand(21),
              query,
              search_uuid: rand(21),
              lang: "",
              agent_lang: "en",
              search_options: { langcode: "en" },
              search_video: true,
              query_from: "default",
              category: "google",
              auto_routing: true,
              mode: "concise",
              device_id: rand(32),
              documents: [],
              document_action: "",
            },
          })
        );
      });

      client.on("message", (_topic: string, message: Uint8Array) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(message));
          if (data.status === "process") {
            const c = data.data;
            if (c?.type === "answer") result.text = c.data?.text || result.text;
            else if (c?.type === "final_contexts") {
              result.sources = (c.data?.sources || []).map((s: any, i: number) => ({ index: i + 1, ...s }));
            }
          } else if (data.status === "complete") {
            clearTimeout(timer);
            try { client.end(); } catch (_) {}
            resolve(result);
          }
        } catch (_) { /* ignore */ }
      });

      client.on("error", (err: any) => {
        clearTimeout(timer);
        try { client.end(true); } catch (_) {}
        reject(err);
      });
    } catch (err) {
      clearTimeout(timer);
      try { client?.end(true); } catch (_) {}
      reject(err);
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.length > 1000) {
      return new Response(JSON.stringify({ error: "invalid_query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await ask(query.trim());
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});