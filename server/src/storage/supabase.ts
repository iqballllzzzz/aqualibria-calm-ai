import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import { log } from "../utils/log.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    log.warn("Supabase not configured — running in stateless mode (no persistence).");
    return null;
  }
  client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Insert a row into public.agent_runs. Failures are logged but never throw. */
export async function recordRun(row: {
  project_id: string | null;
  user_id: string | null;
  tool: string;
  cmd?: string | null;
  cwd?: string | null;
  exit_code?: number | null;
  duration_ms?: number | null;
  stdout_truncated?: string | null;
  stderr_truncated?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("agent_runs").insert({
    project_id: row.project_id,
    user_id: row.user_id,
    tool: row.tool,
    cmd: row.cmd ?? null,
    cwd: row.cwd ?? null,
    exit_code: row.exit_code ?? null,
    duration_ms: row.duration_ms ?? null,
    stdout_truncated: row.stdout_truncated?.slice(0, 8000) ?? null,
    stderr_truncated: row.stderr_truncated?.slice(0, 8000) ?? null,
    error: row.error ?? null,
    metadata: row.metadata ?? {},
  });
  if (error) log.warn({ err: error }, "Failed to record agent run");
}
