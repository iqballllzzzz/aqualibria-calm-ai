import { Router } from "express";
import { z } from "zod";
import { deleteFileSafe, listFilesSafe, readFileSafe, writeFileSafe } from "../sandbox/index.js";
import { requireAuth } from "../utils/auth.js";

export const filesRouter: Router = Router();

const ProjectParam = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/) });

filesRouter.get("/projects/:id/files", requireAuth(), async (req, res) => {
  const parsed = ProjectParam.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  try {
    const files = await listFilesSafe(parsed.data.id, ".");
    res.json({ files });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const WriteBody = z.object({
  path: z.string().min(1).max(1024),
  content: z.string(),
});

filesRouter.post("/projects/:id/files", requireAuth(), async (req, res) => {
  const parsed = ProjectParam.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  const body = WriteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid body", details: body.error.flatten() });
    return;
  }
  try {
    await writeFileSafe(parsed.data.id, body.data.path, body.data.content);
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

filesRouter.get("/projects/:id/file", requireAuth(), async (req, res) => {
  const parsed = ProjectParam.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  const filePath = typeof req.query.path === "string" ? req.query.path : "";
  if (!filePath) {
    res.status(400).json({ error: "path query param required" });
    return;
  }
  try {
    const content = await readFileSafe(parsed.data.id, filePath);
    res.type("text/plain").send(content);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

filesRouter.delete("/projects/:id/file", requireAuth(), async (req, res) => {
  const parsed = ProjectParam.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  const filePath = typeof req.query.path === "string" ? req.query.path : "";
  if (!filePath) {
    res.status(400).json({ error: "path query param required" });
    return;
  }
  try {
    await deleteFileSafe(parsed.data.id, filePath);
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
