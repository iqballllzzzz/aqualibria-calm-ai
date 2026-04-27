# Aqualibria Master Architect — Agent Backend

Node.js + Express service that powers the **Fullstack Agent Studio** in
AquaLibriaAI. It exposes a sandboxed code execution environment, an
xterm.js-compatible WebSocket terminal, and a LangChain + Gemini agent loop
governed by the **Master Architect** system prompt.

This service is intentionally **not** deployed on Vercel — it spawns child
processes (`npm install`, `node`, `git`, ...) and needs a real filesystem.
Run it on a VPS / Docker host.

## Endpoints

| Method | Path                              | Auth | Description                                    |
| ------ | --------------------------------- | ---- | ---------------------------------------------- |
| GET    | `/healthz`                        | —    | Liveness probe.                                |
| POST   | `/api/agent/chat`                 | yes  | SSE stream: agent thinking + tool events.      |
| GET    | `/api/agent/projects`             | yes  | List the user's projects from Supabase.        |
| POST   | `/api/agent/projects`             | yes  | Create a new project + workspace.              |
| GET    | `/api/agent/projects/:id/files`   | yes  | List files for a project.                      |
| POST   | `/api/agent/projects/:id/files`   | yes  | Write a single file (path + content).          |
| POST   | `/api/agent/projects/:id/run`     | yes  | One-shot command execution in the sandbox.     |
| POST   | `/api/agent/projects/:id/publish` | yes  | Mark project as published.                     |
| WS     | `/ws/terminal`                    | yes  | xterm.js terminal stream (query: projectId).   |

All authenticated endpoints accept either a Firebase ID token in the
`Authorization: Bearer <token>` header or, in development mode, a raw
`X-Aqualibria-User: <userId>` header (controlled by `NODE_ENV`).

## Architecture

```
HTTP/WS  ──▶  Express + ws  ──▶  Agent loop (LangChain + Gemini)
                          │
                          ▼
                    Sandbox interface
                    ├── DockerSandbox (production)
                    └── LocalSandbox (dev, node-pty fallback)
                          │
                          ▼
                  Per-project workspace dir
                          │
                          ▼
              Supabase (agent_projects, agent_runs)
```

## Running locally

```bash
cp .env.example .env
# fill GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

The dev sandbox uses your local shell (`node-pty` if available, else `child_process`).
This is **not** safe for untrusted users — only use locally.

## Running with Docker (recommended for production)

```bash
cp .env.example .env
docker compose up -d --build
```

The compose file mounts the host docker socket so the backend can spawn
ephemeral runner containers (`SANDBOX_IMAGE=node:20-alpine` by default) with:

- `--network none` (deny outbound network unless explicitly enabled)
- `--read-only` root filesystem with a writable `tmpfs` for `/tmp`
- `--memory 512m --cpus 1 --pids-limit 256`
- `--user 1000:1000`
- A bind mount of `/var/aqualibria/workspaces/<projectId>` to `/workspace`

Front the service with Caddy / Nginx for TLS. Recommended subdomain:
`agent.<your-domain>`.

## Security model

- Every command is checked against an allowlist (`npm`, `npx`, `node`, `git`,
  `ls`, `cat`, `mkdir`, `cp`, `mv`, `rm` with workspace-scoped path checks).
- Every file path is resolved against the workspace root; absolute paths and
  `..` traversal are rejected.
- Hard cap of 1 MB per file write (`MAX_FILE_BYTES`).
- Wall-clock timeout per command (`SANDBOX_TIMEOUT_MS`, default 120 s).
- Every tool invocation is logged in `public.agent_runs` for audit.

See `src/sandbox/security.ts` for the full list.

## Tuning

| Env var               | Default               | Notes                                |
| --------------------- | --------------------- | ------------------------------------ |
| `GEMINI_MODEL`        | `gemini-2.5-pro`      | Use `gemini-2.5-flash` for v2 plan.  |
| `SANDBOX_MODE`        | `local`               | `docker` for production.             |
| `SANDBOX_TIMEOUT_MS`  | `120000`              | Per-command wall clock.              |
| `MAX_FILE_BYTES`      | `1048576`             | 1 MB.                                |
| `RATE_LIMIT_MAX`      | `120`                 | Per IP per window.                   |
