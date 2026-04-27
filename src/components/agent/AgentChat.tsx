import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Terminal as TerminalIcon, FileCode, CheckCircle2, AlertTriangle } from "lucide-react";
import { streamAgentChat, type AgentEvent, type ChatTurn } from "@/lib/agentApi";

interface Props {
  projectId: string;
  onToolEvent?: (ev: AgentEvent) => void;
  className?: string;
}

interface UiMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  pending?: boolean;
  toolName?: string;
  ok?: boolean;
}

const AgentChat: React.FC<Props> = ({ projectId, onToolEvent, className }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);

    const history: ChatTurn[] = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));

    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAgentChat({
        projectId,
        message: text,
        history,
        signal: controller.signal,
        onEvent: (ev) => {
          onToolEvent?.(ev);
          if (ev.type === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + ev.text } : m,
              ),
            );
          } else if (ev.type === "tool_call") {
            const summary = describeToolCall(ev.call);
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "tool", content: summary, toolName: ev.call.tool },
            ]);
          } else if (ev.type === "tool_result") {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "tool",
                content: (ev.result.output ?? ev.result.error ?? "").slice(0, 600),
                toolName: ev.call.tool,
                ok: ev.result.ok,
              },
            ]);
          } else if (ev.type === "warning") {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "tool", content: `⚠ ${ev.message}`, ok: false },
            ]);
          } else if (ev.type === "done") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
            );
          } else if (ev.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + `\n[error] ${ev.message}`, pending: false }
                  : m,
              ),
            );
          }
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + `\n[error] ${msg}`, pending: false } : m,
        ),
      );
    } finally {
      setBusy(false);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)));
    }
  };

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-foreground-muted text-center px-6">
            <div>
              <p className="font-semibold mb-1">Master Architect ready.</p>
              <p>Describe what you want to build — full-stack, single-file, anything.</p>
            </div>
          </div>
        ) : null}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-border bg-secondary/30 text-sm p-2 outline-none focus:border-primary/40 max-h-32"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="e.g. Buatkan landing page Tailwind untuk produk SaaS..."
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={busy || !input.trim()}
            className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: UiMessage }> = ({ message }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary/15 text-foreground text-sm px-3 py-2 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === "tool") {
    const Icon = message.toolName === "run_cmd" ? TerminalIcon : message.toolName ? FileCode : AlertTriangle;
    return (
      <div className="flex justify-start">
        <div
          className={`max-w-[85%] rounded-xl border text-[11px] font-mono px-2 py-1.5 flex items-start gap-1.5 ${
            message.ok === false
              ? "border-red-500/30 bg-red-500/5 text-red-400"
              : "border-border bg-secondary/40 text-foreground-muted"
          }`}
        >
          <Icon className="w-3 h-3 mt-0.5 shrink-0" />
          <div>
            {message.toolName ? <span className="text-foreground font-bold">{message.toolName}</span> : null}
            {message.toolName ? " " : ""}
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-secondary/40 text-foreground text-sm px-3 py-2 whitespace-pre-wrap">
        {message.content || (message.pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "")}
      </div>
    </div>
  );
};

function describeToolCall(call: { tool: string } & Record<string, unknown>): string {
  const c = call as unknown as Record<string, string | number | undefined>;
  switch (call.tool) {
    case "write_file":
      return `write ${c.path ?? ""}`;
    case "delete_file":
      return `delete ${c.path ?? ""}`;
    case "read_file":
      return `read ${c.path ?? ""}`;
    case "list_files":
      return `list ${c.path ?? ""}`;
    case "run_cmd":
      return `$ ${c.cmd ?? ""}`;
    case "open_preview":
      return `open preview ${c.entry ?? ""}`;
    case "publish":
      return `publish ${c.slug ?? ""}`;
    case "done":
      return `done — ${c.summary ?? ""}`;
    default:
      return JSON.stringify(call);
  }
}

export default AgentChat;
