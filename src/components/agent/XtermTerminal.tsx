import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { buildTerminalWSUrl } from "@/lib/agentApi";

interface Props {
  projectId: string;
  className?: string;
}

const XtermTerminal: React.FC<Props> = ({ projectId, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      theme: { background: "#0b0b0f", foreground: "#e2e8f0", cursor: "#a78bfa" },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fit;

    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        /* noop */
      }
    });

    let cancelled = false;
    let ws: WebSocket | null = null;

    void (async () => {
      const cols = term.cols;
      const rows = term.rows;
      const url = await buildTerminalWSUrl(projectId, cols, rows);
      if (cancelled) return;
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        term.writeln("\x1b[2;37m[connected to sandbox]\x1b[0m");
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type: string; data?: string; code?: number };
          if (msg.type === "stdout" && msg.data) term.write(msg.data);
          else if (msg.type === "exit") term.writeln(`\r\n\x1b[33m[process exited code=${msg.code}]\x1b[0m`);
          else if (msg.type === "error") term.writeln(`\r\n\x1b[31m[error] ${ev.data as string}\x1b[0m`);
        } catch {
          term.write(ev.data as string);
        }
      };
      ws.onclose = () => {
        term.writeln("\r\n\x1b[2;37m[disconnected]\x1b[0m");
      };
      ws.onerror = () => {
        term.writeln("\r\n\x1b[31m[ws error]\x1b[0m");
      };
      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stdin", data }));
        }
      });
      term.onResize(({ cols: c, rows: r }) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: c, rows: r }));
        }
      });
    })();

    const onResize = () => {
      try {
        fitRef.current?.fit();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      try {
        ws?.close();
      } catch {
        /* noop */
      }
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      wsRef.current = null;
    };
  }, [projectId]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
};

export default XtermTerminal;
