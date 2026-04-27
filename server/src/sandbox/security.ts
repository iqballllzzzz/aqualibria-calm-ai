import path from "node:path";

const ALLOWED_BINS = new Set([
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "node",
  "git",
  "ls",
  "cat",
  "echo",
  "mkdir",
  "cp",
  "mv",
  "rm",
  "touch",
  "pwd",
  "true",
  "false",
  "tsc",
  "vite",
  "tsx",
  "head",
  "tail",
  "sed",
  "grep",
  "awk",
  "find",
  "wc",
  "sh",
  "bash",
  "env",
]);

const FORBIDDEN_FRAGMENTS = [
  "rm -rf /",
  "rm -rf /*",
  ":(){ :|:& };:",
  "mkfs",
  "dd if=",
  ">/dev/sda",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
  "wget http",
  "curl http",
  "/etc/passwd",
  "/etc/shadow",
];

export interface CommandValidation {
  ok: boolean;
  reason?: string;
}

/** Reject obviously dangerous commands. Not a substitute for Docker isolation. */
export function validateCommand(cmd: string): CommandValidation {
  if (!cmd || typeof cmd !== "string") return { ok: false, reason: "empty command" };
  if (cmd.length > 8000) return { ok: false, reason: "command too long" };

  for (const frag of FORBIDDEN_FRAGMENTS) {
    if (cmd.toLowerCase().includes(frag.toLowerCase())) {
      return { ok: false, reason: `forbidden fragment: ${frag}` };
    }
  }

  // Reject pipes that exec downloaded scripts.
  if (/\b(curl|wget)\s[^|]*\|\s*(sh|bash|zsh|node|python)/i.test(cmd)) {
    return { ok: false, reason: "piping network input into a shell is not allowed" };
  }

  // First binary token must be in the allowlist.
  const firstToken = cmd
    .trim()
    .split(/\s+/)[0]
    .replace(/^["']/, "")
    .replace(/["']$/, "");
  if (!firstToken) return { ok: false, reason: "no binary specified" };
  // Allow `./script.sh` style only when it stays inside workspace; that's enforced by cwd.
  if (firstToken.startsWith("/")) {
    return { ok: false, reason: "absolute binary paths are not allowed" };
  }
  if (firstToken.startsWith("..")) {
    return { ok: false, reason: "parent-dir binary paths are not allowed" };
  }
  if (firstToken.startsWith("./")) return { ok: true };
  if (!ALLOWED_BINS.has(firstToken)) {
    return { ok: false, reason: `binary "${firstToken}" is not in the allowlist` };
  }
  return { ok: true };
}

/**
 * Resolve a (possibly relative) workspace-relative path and ensure it stays
 * within `workspaceRoot`. Throws if the path escapes the workspace.
 */
export function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("path is required");
  }
  if (relativePath.length > 1024) throw new Error("path too long");
  // Reject Windows-style absolute paths just in case.
  if (/^[a-z]:/i.test(relativePath)) throw new Error("absolute path not allowed");

  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (normalized.startsWith("/")) throw new Error("absolute path not allowed");
  if (normalized.split("/").includes("..")) throw new Error("parent traversal not allowed");

  const resolved = path.resolve(workspaceRoot, normalized);
  const rootResolved = path.resolve(workspaceRoot);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new Error("path escapes workspace");
  }
  return resolved;
}

export function validateProjectId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}
