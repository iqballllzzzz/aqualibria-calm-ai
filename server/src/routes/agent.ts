import { Router } from "express";
import { z } from "zod";
import { runAgent } from "../agent/planner.js";
import { requireAuth } from "../utils/auth.js";
import { log } from "../utils/log.js";

export const agentRouter: Router = Router();

const ChatBody = z.object({
  projectId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  message: z.string().min(1).max(20_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "tool"]),
        content: z.string(),
      }),
    )
    .max(40)
    .default([]),
  maxSteps: z.number().int().positive().max(20).optional(),
});

agentRouter.post("/chat", requireAuth(), async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }
  const { projectId, message, history, maxSteps } = parsed.data;
  const userId = req.user!.uid;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  try {
    for await (const ev of runAgent({ projectId, userId, history, userMessage: message, maxSteps })) {
      if (aborted) break;
      send(ev.type, ev);
    }
  } catch (err: unknown) {
    log.error({ err }, "agent loop crashed");
    send("error", { message: err instanceof Error ? err.message : String(err) });
  } finally {
    send("end", { ok: true });
    res.end();
  }
});
