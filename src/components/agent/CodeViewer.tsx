import React from "react";
import { Copy, Check } from "lucide-react";
import { ProjectFile } from "./FileExplorer";

const LANG_MAP: Record<string, string> = {
  ts: "TypeScript", tsx: "React TSX", js: "JavaScript", jsx: "React JSX",
  css: "CSS", html: "HTML", json: "JSON", md: "Markdown",
  env: "Environment", toml: "TOML", yaml: "YAML", yml: "YAML",
  py: "Python", sh: "Shell",
};

const CodeViewer: React.FC<{ file: ProjectFile | null; isStreaming?: boolean }> = ({ file, isStreaming }) => {
  const [copied, setCopied] = React.useState(false);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-muted text-sm">
        <p>Select a file to view</p>
      </div>
    );
  }

  const ext = file.path.split(".").pop()?.toLowerCase() || "";
  const langLabel = LANG_MAP[ext] || ext.toUpperCase();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{langLabel}</span>
          <span className="text-xs text-foreground-muted truncate">{file.path}</span>
          {isStreaming && <span className="text-[10px] text-primary font-bold animate-pulse">●</span>}
        </div>
        <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0">
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-foreground-muted" />}
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <pre className="p-3 text-xs leading-relaxed">
          <code className="text-foreground whitespace-pre">{file.content}{isStreaming ? "▌" : ""}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeViewer;
