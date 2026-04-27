import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSupabase } from "../storage/supabase.js";
import { ensureWorkspace, execCommand, listFilesSafe } from "../sandbox/index.js";
import { requireAuth } from "../utils/auth.js";

export const projectsRouter: Router = Router();

const ProjectParam = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/) });

projectsRouter.get("/projects", requireAuth(), async (req, res) => {
  const sb = getSupabase();
  if (!sb) {
    res.json({ projects: [] });
    return;
  }
  const { data, error } = await sb
    .from("agent_projects")
    .select("id,title,description,agent_type,is_published,published_url,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ projects: data ?? [] });
});

const CreateBody = z.object({
  title: z.string().min(1).max(200).default("Untitled Project"),
  description: z.string().max(2000).optional(),
});

projectsRouter.post("/projects", requireAuth(), async (req, res) => {
  const body = CreateBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "invalid body", details: body.error.flatten() });
    return;
  }
  const id = nanoid(16);
  await ensureWorkspace(id);
  const sb = getSupabase();
  if (sb) {
    await sb.from("agent_projects").insert({
      id,
      user_id: req.user!.uid,
      title: body.data.title,
      description: body.data.description ?? null,
      agent_type: "fullstack",
      files: [],
    });
  }
  res.json({ id, title: body.data.title });
});

const RunBody = z.object({
  cmd: z.string().min(1).max(8000),
  cwd: z.string().max(1024).default("."),
  timeout_ms: z.number().int().positive().max(600_000).optional(),
});

projectsRouter.post("/projects/:id/run", requireAuth(), async (req, res) => {
  const params = ProjectParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  const body = RunBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid body", details: body.error.flatten() });
    return;
  }
  try {
    const result = await execCommand(params.data.id, body.data.cmd, body.data.cwd, body.data.timeout_ms);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

projectsRouter.post("/projects/:id/publish", requireAuth(), async (req, res) => {
  const params = ProjectParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid project id" });
    return;
  }
  const sb = getSupabase();
  if (!sb) {
    res.status(503).json({ error: "supabase not configured" });
    return;
  }
  const slug = (typeof req.body?.slug === "string" ? req.body.slug : nanoid(12)).slice(0, 64);
  // Snapshot files into the project row.
  const files = await listFilesSafe(params.data.id, ".");
  const filePayload: Array<{ path: string; content?: string }> = files
    .filter((f) => !f.isDir)
    .slice(0, 200)
    .map((f) => ({ path: f.path }));
  const { error } = await sb
    .from("agent_projects")
    .update({ is_published: true, published_url: slug, files: filePayload as unknown as never })
    .eq("id", params.data.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true, slug });
});
