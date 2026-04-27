import { spawn } from "node:child_process";
import { config } from "../config.js";
import { log } from "../utils/log.js";
import type { ExecRequest, ExecResult, PtyHandle, Sandbox } from "./types.js";

/**
 * DockerSandbox: every exec spawns a fresh `docker run` with strict isolation.
 *
 * NOTE: requires the docker CLI on PATH and access to the docker socket.
 * In compose, mount /var/run/docker.sock into this container.
 */
export class DockerSandbox implements Sandbox {
  async exec(req: ExecRequest): Promise<ExecResult> {
    const start = Date.now();
    const args = [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=64m",
      "--memory",
      "512m",
      "--memory-swap",
      "512m",
      "--cpus",
      "1",
      "--pids-limit",
      "256",
      "--user",
      "1000:1000",
      "-w",
      "/workspace",
      "-v",
      `${req.workspace}:/workspace`,
      config.SANDBOX_IMAGE,
      "sh",
      "-lc",
      req.cmd,
    ];
    return new Promise<ExecResult>((resolve) => {
      const child = spawn("docker", args, { env: process.env });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const limit = 1024 * 1024;
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
        log.error({ err }, "docker spawn failed");
        resolve({
          stdout,
          stderr: stderr + `\n[docker-error] ${err.message}`,
          exitCode: -1,
          durationMs: Date.now() - start,
          timedOut,
        });
      });
    });
  }

  spawnPty(req: { workspace: string; cols: number; rows: number }): PtyHandle {
    // For pty we exec `docker run -it` and pipe stdio. cols/rows are passed
    // through the `COLUMNS`/`LINES` env vars; full TTY resize requires
    // dockerode for proper IO. This implementation is good enough for
    // interactive shells; switch to dockerode if you need granular control.
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "-i",
        "--network",
        "none",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,size=64m",
        "--memory",
        "512m",
        "--cpus",
        "1",
        "--pids-limit",
        "256",
        "--user",
        "1000:1000",
        "-w",
        "/workspace",
        "-v",
        `${req.workspace}:/workspace`,
        "-e",
        `COLUMNS=${req.cols}`,
        "-e",
        `LINES=${req.rows}`,
        "-e",
        "TERM=xterm-256color",
        config.SANDBOX_IMAGE,
        "sh",
        "-l",
      ],
      { env: process.env },
    );
    const dataListeners: Array<(chunk: string | Buffer) => void> = [];
    const exitListeners: Array<(code: number, signal?: number) => void> = [];
    child.stdout.on("data", (d) => dataListeners.forEach((l) => l(d)));
    child.stderr.on("data", (d) => dataListeners.forEach((l) => l(d)));
    child.on("close", (code, signal) => exitListeners.forEach((l) => l(code ?? -1, signal as unknown as number)));
    return {
      onData: (cb) => dataListeners.push(cb),
      onExit: (cb) => exitListeners.push(cb),
      write: (d) => child.stdin.write(d),
      resize: () => {
        /* not supported via plain spawn; would need dockerode. */
      },
      kill: (s) => child.kill((s as NodeJS.Signals) ?? "SIGTERM"),
    };
  }
}
