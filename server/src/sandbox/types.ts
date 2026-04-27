export interface ExecRequest {
  projectId: string;
  workspace: string;
  cwd: string;
  cmd: string;
  timeoutMs: number;
  env?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface Sandbox {
  exec(req: ExecRequest): Promise<ExecResult>;
  /** Spawn a long-running pty (for xterm.js terminal). */
  spawnPty?(req: { workspace: string; cols: number; rows: number }): PtyHandle;
}

export interface PtyHandle {
  onData(cb: (chunk: Buffer | string) => void): void;
  onExit(cb: (code: number, signal?: number) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
}
