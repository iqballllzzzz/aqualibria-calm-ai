import { z } from "zod";

/**
 * The strict JSON schema for tool calls emitted by the Master Architect.
 * Anything that doesn't conform to this is rejected before execution.
 */
export const ToolCall = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("write_file"),
    path: z.string().min(1),
    content: z.string(),
  }),
  z.object({
    tool: z.literal("delete_file"),
    path: z.string().min(1),
  }),
  z.object({
    tool: z.literal("run_cmd"),
    cmd: z.string().min(1),
    cwd: z.string().default("."),
    timeout_ms: z.number().int().positive().max(600_000).optional(),
  }),
  z.object({
    tool: z.literal("read_file"),
    path: z.string().min(1),
  }),
  z.object({
    tool: z.literal("list_files"),
    path: z.string().default("."),
  }),
  z.object({
    tool: z.literal("open_preview"),
    entry: z.string().default("index.html"),
  }),
  z.object({
    tool: z.literal("publish"),
    slug: z.string().min(1).max(64),
  }),
  z.object({
    tool: z.literal("done"),
    summary: z.string().min(1),
  }),
]);

export type ToolCall = z.infer<typeof ToolCall>;

export interface ToolResult {
  ok: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Extract a fenced ```json ... ``` block from the model's output and parse it.
 * Returns null when no valid tool call is present (the model may still emit
 * <plan> or <done> prose).
 */
export function extractToolCall(text: string): ToolCall | null {
  const fenceRegex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = fenceRegex.exec(text)) !== null) {
    last = match[1];
  }
  if (!last) return null;
  try {
    const parsed = JSON.parse(last);
    const result = ToolCall.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}
