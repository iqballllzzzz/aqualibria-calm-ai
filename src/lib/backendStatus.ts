// Backend availability probe. Used by /status page and to auto-bypass AI
// features when the backend or its edge functions are unreachable.
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type ProbeState = "ok" | "degraded" | "down" | "checking";

export interface BackendProbe {
  auth: ProbeState;
  database: ProbeState;
  aiChat: ProbeState;   // gemini-chat edge function
  storage: ProbeState;  // user-images bucket
  updatedAt: number;
  message?: string;
}

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });

export const probeBackend = async (): Promise<BackendProbe> => {
  const out: BackendProbe = {
    auth: "checking", database: "checking", aiChat: "checking", storage: "checking",
    updatedAt: Date.now(),
  };

  // Auth ping
  try {
    await withTimeout(supabase.auth.getSession(), 4000, "auth");
    out.auth = "ok";
  } catch { out.auth = "down"; }

  // DB ping (lightweight head request)
  try {
    const { error } = await withTimeout(
      supabase.from("user_roles").select("user_id", { head: true, count: "exact" }).limit(1),
      5000, "db"
    ) as any;
    out.database = error ? "degraded" : "ok";
  } catch { out.database = "down"; }

  // AI edge function ping — expects 200/4xx (function alive), not network failure
  try {
    const res = await withTimeout(fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
      method: "OPTIONS",
      headers: { apikey: SUPABASE_KEY, "Access-Control-Request-Method": "POST" },
    }), 6000, "ai");
    out.aiChat = res.ok || res.status < 500 ? "ok" : "degraded";
  } catch { out.aiChat = "down"; }

  // Storage bucket ping
  try {
    const { error } = await withTimeout(
      supabase.storage.from("user-images").list("", { limit: 1 }),
      5000, "storage"
    ) as any;
    out.storage = error ? "degraded" : "ok";
  } catch { out.storage = "down"; }

  return out;
};

// A single global flag other modules can consult synchronously to bypass AI.
let _lastProbe: BackendProbe | null = null;
export const getLastBackendProbe = () => _lastProbe;
export const isAiAvailable = () => !_lastProbe || _lastProbe.aiChat !== "down";
export const setLastBackendProbe = (p: BackendProbe) => { _lastProbe = p; };

// Convenience: refresh probe every N ms while the page is visible.
export const startBackendWatcher = (intervalMs = 60_000) => {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try { const p = await probeBackend(); setLastBackendProbe(p); } catch {}
    if (!stopped) setTimeout(tick, intervalMs);
  };
  tick();
  return () => { stopped = true; };
};