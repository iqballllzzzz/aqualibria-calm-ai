import React, { useMemo } from "react";
import { ProjectFile } from "./FileExplorer";
import { ExternalLink, Monitor } from "lucide-react";

interface LivePreviewProps {
  files: ProjectFile[];
  projectId?: string;
}

function buildPreviewHTML(files: ProjectFile[]): string {
  const htmlFile = files.find(f => f.path.endsWith("index.html") || f.path.endsWith(".html"));
  const cssFiles = files.filter(f => f.path.endsWith(".css"));
  const jsFiles = files.filter(f => f.path.endsWith(".js") || f.path.endsWith(".ts"));

  if (htmlFile) {
    let html = htmlFile.content;
    // Inject CSS
    const cssContent = cssFiles.map(f => f.content).join("\n");
    if (cssContent && !html.includes("<style>")) {
      html = html.replace("</head>", `<style>${cssContent}</style></head>`);
    }
    // Inject JS
    const jsContent = jsFiles.filter(f => !f.path.endsWith(".ts")).map(f => f.content).join("\n");
    if (jsContent && !html.includes("<script>")) {
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    }
    return html;
  }

  // Fallback: combine all files into a simple HTML page
  const css = cssFiles.map(f => f.content).join("\n");
  const js = jsFiles.map(f => f.content).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preview</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;padding:20px}${css}</style>
</head><body>
<div id="root"></div>
<script>${js}</script>
</body></html>`;
}

const LivePreview: React.FC<LivePreviewProps> = ({ files, projectId }) => {
  const html = useMemo(() => buildPreviewHTML(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-muted">
        <div className="text-center">
          <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-foreground-muted">{projectId ? `app/${projectId.slice(0, 8)}` : "Preview"}</span>
        <button className="p-1 rounded hover:bg-accent transition-colors">
          <ExternalLink className="w-3 h-3 text-foreground-muted" />
        </button>
      </div>
      <iframe
        srcDoc={html}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-modals"
        title="Live Preview"
      />
    </div>
  );
};

export default LivePreview;
