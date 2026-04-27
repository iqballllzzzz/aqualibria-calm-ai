import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { ensureWorkspace, getSandbox } from "../sandbox/index.js";
import { verifyToken } from "../utils/auth.js";
import { log } from "../utils/log.js";

interface ClientMessage {
  type: "stdin" | "resize" | "ping";
  data?: string;
  cols?: number;
  rows?: number;
}

export function attachTerminalWS(server: Server, path = "/ws/terminal"): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url) {
      socket.destroy();
      return;
    }
    let url: URL;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== path) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      void onConnection(ws, url, req.headers["x-aqualibria-user"] as string | undefined);
    });
  });

  return wss;
}

async function onConnection(ws: WebSocket, url: URL, devUserHeader: string | undefined) {
  const projectId = url.searchParams.get("projectId");
  const token = url.searchParams.get("token");

  if (!projectId || !/^[a-zA-Z0-9_-]{1,64}$/.test(projectId)) {
    ws.close(1008, "invalid projectId");
    return;
  }

  const user = await verifyToken(token ? `Bearer ${token}` : undefined, devUserHeader);
  if (!user) {
    ws.close(1008, "unauthorized");
    return;
  }

  let workspace: string;
  try {
    workspace = await ensureWorkspace(projectId);
  } catch (err) {
    log.warn({ err }, "ensureWorkspace failed");
    ws.close(1011, "workspace error");
    return;
  }

  const sandbox = getSandbox();
  if (!sandbox.spawnPty) {
    ws.send(JSON.stringify({ type: "error", message: "sandbox does not support pty" }));
    ws.close();
    return;
  }

  const cols = Number(url.searchParams.get("cols")) || 80;
  const rows = Number(url.searchParams.get("rows")) || 24;

  const pty = sandbox.spawnPty({ workspace, cols, rows });

  pty.onData((chunk) => {
    if (ws.readyState !== ws.OPEN) return;
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    ws.send(JSON.stringify({ type: "stdout", data: text }));
  });
  pty.onExit((code, signal) => {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "exit", code, signal }));
    ws.close();
  });

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString("utf8")) as ClientMessage;
    } catch {
      return;
    }
    if (msg.type === "stdin" && typeof msg.data === "string") {
      pty.write(msg.data);
    } else if (msg.type === "resize" && msg.cols && msg.rows) {
      pty.resize(msg.cols, msg.rows);
    } else if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
    }
  });

  ws.on("close", () => {
    try {
      pty.kill();
    } catch {
      /* noop */
    }
  });
}
