import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { config } from "../config.js";
import { log } from "../utils/log.js";
import type { ExecRequest, ExecResult, PtyHandle, Sandbox } from "./types.js";

interface PtyModule {
  spawn: (
    file: string,
    args: string[],
    options: { cols: number; rows: number; cwd: string; env: Record<string, string | undefined> },
  ) => {
    onData(cb: (data: string) => void): void;
    onExit(cb: (e: { exitCode: number; signal?: number }) => void): void;
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
  };
}

let _ptyModule: PtyModule | null | undefined = undefined; // undefined = not loaded yet

async function loadPty(): Promise<PtyModule | null> {
  if (_ptyModule !== undefined) return _ptyModule;
  try {
    const mod = (await import("node-pty")) as unknown as PtyModule;
    _ptyModule = mod;
  } catch (err) {
    log.warn({ err }, "node-pty not available — terminal will use simulated mode");
    _ptyModule = null;
  }
  return _ptyModule;
}

/**
 * LocalSandbox: runs commands directly on the host. Intended for development
 * only. In production, use DockerSandbox.
 */
export class LocalSandbox implements Sandbox {
  async exec(req: ExecRequest): Promise<ExecResult> {
    const start = Date.now();
    return new Promise<ExecResult>((resolve) => {
      const child = spawn("/bin/sh", ["-lc", req.cmd], {
        cwd: req.cwd,
        env: { ...process.env, ...req.env, NODE_ENV: process.env.NODE_ENV ?? "development" },
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const limit = 1024 * 1024; // 1 MB cap per stream
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          /* noop */
        }
      }, req.timeoutMs);
      child.stdout.on("data", (d: Buffer) => {
        if (stdout.length < limit) stdout += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        if (stderr.length < limit) stderr += d.toString();
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? -1,
          durationMs: Date.now() - start,
          timedOut,
        });
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr + `\n[spawn-error] ${err.message}`,
          exitCode: -1,
          durationMs: Date.now() - start,
          timedOut,
        });
      });
    });
  }

  spawnPty(req: { workspace: string; cols: number; rows: number }): PtyHandle {
    const cols = Math.max(20, Math.min(req.cols || 80, 400));
    const rows = Math.max(5, Math.min(req.rows || 24, 200));

    // Prefer real pty when available, else simulate via spawn.
    let nativeHandle: PtyHandle | null = null;
    void loadPty().then((mod) => {
      if (!mod) return;
      try {
        const pty = mod.spawn("/bin/sh", ["-l"], {
          cols,
          rows,
          cwd: req.workspace,
          env: { ...process.env, TERM: "xterm-256color", PS1: "\\w $ " },
        });
        nativeHandle = createPtyHandleFromNode(pty);
        emitter.emit("ready", nativeHandle);
      } catch (err) {
        log.error({ err }, "failed to spawn node-pty");
      }
    });

    const emitter = new EventEmitter();
    const queuedWrites: string[] = [];
    let pendingResize: { cols: number; rows: number } | null = null;
    const dataListeners: Array<(chunk: string | Buffer) => void> = [];
    const exitListeners: Array<(code: number, signal?: number) => void> = [];
    let closed = false;

    emitter.once("ready", (handle: PtyHandle) => {
      if (closed) {
        handle.kill();
        return;
      }
      handle.onData((c) => dataListeners.forEach((l) => l(c)));
      handle.onExit((c, s) => exitListeners.forEach((l) => l(c, s)));
      for (const w of queuedWrites) handle.write(w);
      queuedWrites.length = 0;
      if (pendingResize) handle.resize(pendingResize.cols, pendingResize.rows);
    });

    // Fallback simulator: prints a banner and echoes commands via /bin/sh -lc.
    setTimeout(() => {
      if (nativeHandle) return;
      const banner = `Aqualibria sandbox terminal (simulated, no real pty).\r\nWorkspace: ${req.workspace}\r\n$ `;
      dataListeners.forEach((l) => l(banner));
    }, 50);

    return {
      onData(cb) {
        dataListeners.push(cb);
      },
      onExit(cb) {
        exitListeners.push(cb);
      },
      write(data) {
        if (nativeHandle) {
          nativeHandle.write(data);
          return;
        }
        // Simulator: only handles full lines.
        queuedWrites.push(data);
        if (data.includes("\r") || data.includes("\n")) {
          const cmd = queuedWrites.join("").replace(/[\r\n]+$/, "");
          queuedWrites.length = 0;
          if (!cmd.trim()) {
            dataListeners.forEach((l) => l("$ "));
            return;
          }
          const child = spawn("/bin/sh", ["-lc", cmd], {
            cwd: req.workspace,
            env: { ...process.env, TERM: "xterm-256color" },
          });
          child.stdout.on("data", (d) => dataListeners.forEach((l) => l(d)));
          child.stderr.on("data", (d) => dataListeners.forEach((l) => l(d)));
          child.on("close", (code) => {
            dataListeners.forEach((l) => l(`\r\n[exit ${code}]\r\n$ `));
          });
        }
      },
      resize(cols, rows) {
        if (nativeHandle) nativeHandle.resize(cols, rows);
        else pendingResize = { cols, rows };
      },
      kill(signal) {
        closed = true;
        if (nativeHandle) nativeHandle.kill(signal);
      },
    };
  }
}

function createPtyHandleFromNode(pty: ReturnType<PtyModule["spawn"]>): PtyHandle {
  return {
    onData: (cb) => pty.onData((d) => cb(d)),
    onExit: (cb) => pty.onExit((e) => cb(e.exitCode, e.signal)),
    write: (d) => pty.write(d),
    resize: (c, r) => pty.resize(c, r),
    kill: (s) => pty.kill(s),
  };
}

// Used only to keep `config` referenced; tree-shaker friendly.
void config;
