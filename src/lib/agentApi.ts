/**
 * Client SDK for the Aqualibria Master Architect agent backend.
 *
 * The backend lives at VITE_AGENT_API_URL (default http://localhost:8787).
 * In production this should point at your VPS/Docker host.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ProjectFileEntry {
  path: string;
  size: number;
  isDir: boolean;
}

export interface AgentRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export type AgentToolCall =
  | { tool: "write_file"; path: string; content: string }
  | { tool: "delete_file"; path: string }
  | { tool: "run_cmd"; cmd: string; cwd?: string; timeout_ms?: number }
  | { tool: "read_file"; path: string }
  | { tool: "list_files"; path: string }
  | { tool: "open_preview"; entry: string }
  | { tool: "publish"; slug: string }
  | { tool: "done"; summary: string };

export interface AgentToolResult {
  ok: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; call: AgentToolCall }
  | { type: "tool_result"; call: AgentToolCall; result: AgentToolResult }
  | { type: "warning"; message: string }
  | { type: "done"; summary?: string }
  | { type: "error"; message: string }
  | { type: "end" };

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
}

export const AGENT_API_URL: string =
  (import.meta.env.VITE_AGENT_API_URL as string | undefined) ?? "http://localhost:8787";

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    /* ignore */
  }
  // Dev fallback header (only honored when backend NODE_ENV !== production).
  const devUid =
    typeof window !== "undefined" ? window.localStorage.getItem("aqualibria_dev_uid") : null;
  if (devUid) return { "X-Aqualibria-User": devUid };
  return {};
}

export async function listProjects(): Promise<Array<{
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  published_url: string | null;
  updated_at: string;
}>> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects`, {
    headers: { ...(await getAuthHeader()) },
  });
  if (!res.ok) throw new Error(`listProjects failed: ${res.status}`);
  const json = await res.json();
  return json.projects ?? [];
}

export async function createProject(title: string): Promise<{ id: string; title: string }> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`createProject failed: ${res.status}`);
  return res.json();
}

export async function listFiles(projectId: string): Promise<ProjectFileEntry[]> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects/${projectId}/files`, {
    headers: { ...(await getAuthHeader()) },
  });
  if (!res.ok) throw new Error(`listFiles failed: ${res.status}`);
  const json = await res.json();
  return json.files ?? [];
}

export async function readFile(projectId: string, path: string): Promise<string> {
  const res = await fetch(
    `${AGENT_API_URL}/api/agent/projects/${projectId}/file?path=${encodeURIComponent(path)}`,
    { headers: { ...(await getAuthHeader()) } },
  );
  if (!res.ok) throw new Error(`readFile failed: ${res.status}`);
  return res.text();
}

export async function writeFile(projectId: string, path: string, content: string): Promise<void> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects/${projectId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(`writeFile failed: ${res.status}`);
}

export async function runCommand(
  projectId: string,
  cmd: string,
  cwd = ".",
  timeoutMs?: number,
): Promise<AgentRunResult> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects/${projectId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
    body: JSON.stringify({ cmd, cwd, timeout_ms: timeoutMs }),
  });
  if (!res.ok) throw new Error(`runCommand failed: ${res.status}`);
  return res.json();
}

export async function publishProject(projectId: string, slug?: string): Promise<{ ok: boolean; slug: string }> {
  const res = await fetch(`${AGENT_API_URL}/api/agent/projects/${projectId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) throw new Error(`publishProject failed: ${res.status}`);
  return res.json();
}

/**
 * Stream the agent loop as SSE. The callback receives parsed events.
 * Returns an abort handle.
 */
export async function streamAgentChat(opts: {
  projectId: string;
  message: string;
  history?: ChatTurn[];
  maxSteps?: number;
  onEvent: (ev: AgentEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const headers = { "Content-Type": "application/json", ...(await getAuthHeader()) };
  const res = await fetch(`${AGENT_API_URL}/api/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      projectId: opts.projectId,
      message: opts.message,
      history: opts.history ?? [],
      maxSteps: opts.maxSteps,
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`agent chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = parseSSEBlock(block);
      if (ev) opts.onEvent(ev);
    }
  }
}

function parseSSEBlock(block: string): AgentEvent | null {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return { ...(parsed as Record<string, unknown>), type: event } as AgentEvent;
  } catch {
    return null;
  }
}

/** Build a WS URL for the xterm.js terminal. */
export async function buildTerminalWSUrl(projectId: string, cols: number, rows: number): Promise<string> {
  const base = AGENT_API_URL.replace(/^http/, "ws");
  let token = "";
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? "";
  } catch {
    /* ignore */
  }
  if (!token && typeof window !== "undefined") {
    token = window.localStorage.getItem("aqualibria_dev_uid") ?? "";
  }
  const params = new URLSearchParams({
    projectId,
    cols: String(cols),
    rows: String(rows),
  });
  if (token) params.set("token", token);
  return `${base}/ws/terminal?${params.toString()}`;
}
