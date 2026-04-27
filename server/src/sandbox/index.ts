import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { resolveWorkspacePath, validateCommand, validateProjectId } from "./security.js";
import type { ExecResult, Sandbox } from "./types.js";
import { LocalSandbox } from "./local.js";
import { DockerSandbox } from "./docker.js";

export type { Sandbox, ExecResult } from "./types.js";

let _sandbox: Sandbox | null = null;

export function getSandbox(): Sandbox {
  if (_sandbox) return _sandbox;
  _sandbox = config.SANDBOX_MODE === "docker" ? new DockerSandbox() : new LocalSandbox();
  return _sandbox;
}

export async function ensureWorkspace(projectId: string): Promise<string> {
  if (!validateProjectId(projectId)) throw new Error("invalid project id");
  const dir = path.join(config.WORKSPACE_ROOT, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeFileSafe(projectId: string, relativePath: string, content: string): Promise<void> {
  const root = await ensureWorkspace(projectId);
  const target = resolveWorkspacePath(root, relativePath);
  if (Buffer.byteLength(content, "utf8") > config.MAX_FILE_BYTES) {
    throw new Error(`file exceeds ${config.MAX_FILE_BYTES} bytes`);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function readFileSafe(projectId: string, relativePath: string): Promise<string> {
  const root = await ensureWorkspace(projectId);
  const target = resolveWorkspacePath(root, relativePath);
  const stat = await fs.stat(target);
  if (stat.size > config.MAX_FILE_BYTES) throw new Error("file too large");
  return fs.readFile(target, "utf8");
}

export async function deleteFileSafe(projectId: string, relativePath: string): Promise<void> {
  const root = await ensureWorkspace(projectId);
  const target = resolveWorkspacePath(root, relativePath);
  await fs.rm(target, { force: true, recursive: false });
}

export interface ListedFile {
  path: string;
  size: number;
  isDir: boolean;
}

export async function listFilesSafe(projectId: string, relativePath = "."): Promise<ListedFile[]> {
  const root = await ensureWorkspace(projectId);
  const target = resolveWorkspacePath(root, relativePath);
  const out: ListedFile[] = [];
  async function walk(dir: string, prefix: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        out.push({ path: rel, size: 0, isDir: true });
        await walk(full, rel);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        out.push({ path: rel, size: stat.size, isDir: false });
      }
    }
  }
  await walk(target, "");
  return out;
}

export async function execCommand(
  projectId: string,
  cmd: string,
  cwd = ".",
  timeoutMs?: number,
): Promise<ExecResult> {
  const validation = validateCommand(cmd);
  if (!validation.ok) {
    return {
      stdout: "",
      stderr: `[security] ${validation.reason}`,
      exitCode: 126,
      durationMs: 0,
      timedOut: false,
    };
  }
  const sandbox = getSandbox();
  const root = await ensureWorkspace(projectId);
  const cwdAbs = resolveWorkspacePath(root, cwd);
  return sandbox.exec({
    projectId,
    workspace: root,
    cwd: cwdAbs,
    cmd,
    timeoutMs: timeoutMs ?? config.SANDBOX_TIMEOUT_MS,
  });
}
