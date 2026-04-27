import {
  deleteFileSafe,
  ensureWorkspace,
  execCommand,
  listFilesSafe,
  readFileSafe,
  writeFileSafe,
} from "../sandbox/index.js";
import { recordRun } from "../storage/supabase.js";
import { log } from "../utils/log.js";
import { extractToolCall, type ToolCall, type ToolResult } from "./tools.js";
import { streamAgentTurn, type AgentChatTurn } from "./langchain.js";

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; call: ToolCall; result: ToolResult }
  | { type: "warning"; message: string }
  | { type: "done"; summary?: string };

export interface AgentRunOptions {
  projectId: string;
  userId: string | null;
  history: AgentChatTurn[];
  /** New user message to append to history. */
  userMessage: string;
  /** Hard cap on agent loop iterations to avoid infinite loops. */
  maxSteps?: number;
}

/**
 * Drive the Master Architect loop: stream model output, detect tool calls,
 * execute them, feed results back, repeat until <done> or maxSteps.
 *
 * Yields high-level events suitable for SSE.
 */
export async function* runAgent(opts: AgentRunOptions): AsyncGenerator<AgentEvent, void, void> {
  const turns: AgentChatTurn[] = [...opts.history, { role: "user", content: opts.userMessage }];
  const maxSteps = opts.maxSteps ?? 12;

  await ensureWorkspace(opts.projectId);

  for (let step = 0; step < maxSteps; step++) {
    let full = "";
    const it = streamAgentTurn(turns);
    while (true) {
      const r = await it.next();
      if (r.done) {
        full = (r.value as string) || full;
        break;
      }
      full += r.value;
      yield { type: "token", text: r.value };
    }
    turns.push({ role: "assistant", content: full });

    const call = extractToolCall(full);
    if (!call) {
      yield { type: "warning", message: "No tool call detected — ending agent loop." };
      yield { type: "done" };
      return;
    }
    yield { type: "tool_call", call };

    const result = await executeTool(opts.projectId, opts.userId, call);
    yield { type: "tool_result", call, result };

    if (call.tool === "done") {
      yield { type: "done", summary: call.summary };
      return;
    }

    turns.push({
      role: "tool",
      content: JSON.stringify({
        tool: call.tool,
        ok: result.ok,
        output: result.output?.slice(0, 8000) ?? null,
        error: result.error ?? null,
      }),
    });
  }

  yield { type: "warning", message: `Reached maxSteps=${maxSteps} without <done>.` };
  yield { type: "done" };
}

async function executeTool(
  projectId: string,
  userId: string | null,
  call: ToolCall,
): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    switch (call.tool) {
      case "write_file": {
        await writeFileSafe(projectId, call.path, call.content);
        await recordRun({
          project_id: projectId,
          user_id: userId,
          tool: "write_file",
          metadata: { path: call.path, bytes: Buffer.byteLength(call.content, "utf8") },
        });
        return { ok: true, output: `wrote ${call.path}` };
      }
      case "delete_file": {
        await deleteFileSafe(projectId, call.path);
        await recordRun({ project_id: projectId, user_id: userId, tool: "delete_file", metadata: { path: call.path } });
        return { ok: true, output: `deleted ${call.path}` };
      }
      case "read_file": {
        const content = await readFileSafe(projectId, call.path);
        return { ok: true, output: content.slice(0, 32_000) };
      }
      case "list_files": {
        const files = await listFilesSafe(projectId, call.path);
        return {
          ok: true,
          output: files.map((f) => `${f.isDir ? "d" : "-"} ${f.size.toString().padStart(8)} ${f.path}`).join("\n"),
        };
      }
      case "run_cmd": {
        const result = await execCommand(projectId, call.cmd, call.cwd, call.timeout_ms);
        await recordRun({
          project_id: projectId,
          user_id: userId,
          tool: "run_cmd",
          cmd: call.cmd,
          cwd: call.cwd,
          exit_code: result.exitCode,
          duration_ms: result.durationMs,
          stdout_truncated: result.stdout,
          stderr_truncated: result.stderr,
          metadata: { timedOut: result.timedOut },
        });
        return {
          ok: result.exitCode === 0,
          output: `exit=${result.exitCode}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
          metadata: { exitCode: result.exitCode, durationMs: result.durationMs, timedOut: result.timedOut },
        };
      }
      case "open_preview": {
        return { ok: true, output: `preview entry set to ${call.entry}`, metadata: { entry: call.entry } };
      }
      case "publish": {
        return { ok: true, output: `publish requested with slug ${call.slug}`, metadata: { slug: call.slug } };
      }
      case "done": {
        return { ok: true, output: call.summary };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err, call }, "tool execution failed");
    await recordRun({
      project_id: projectId,
      user_id: userId,
      tool: call.tool,
      duration_ms: Date.now() - t0,
      error: msg,
    });
    return { ok: false, error: msg };
  }
}
