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
  const jsFiles = files.filter(f => f.path.endsWith(".js"));

  if (htmlFile) {
    let html = htmlFile.content;
    const cssContent = cssFiles.map(f => f.content).join("\n");
    if (cssContent) {
      if (html.includes("</head>")) {
        html = html.replace("</head>", `<style>${cssContent}</style></head>`);
      } else {
        html = `<style>${cssContent}</style>` + html;
      }
    }
    const jsContent = jsFiles.filter(f => !f.path.endsWith(".ts") && !f.path.endsWith(".tsx")).map(f => f.content).join("\n");
    if (jsContent) {
      if (html.includes("</body>")) {
        html = html.replace("</body>", `<script>${jsContent}</script></body>`);
      } else {
        html += `<script>${jsContent}</script>`;
      }
    }
    return html;
  }

  // Fallback: build a page from all files
  const css = cssFiles.map(f => f.content).join("\n");
  const js = jsFiles.map(f => f.content).join("\n");
  const tsxFiles = files.filter(f => f.path.endsWith(".tsx") || f.path.endsWith(".jsx"));
  const codePreview = tsxFiles.length > 0
    ? `<pre style="white-space:pre-wrap;word-break:break-word;padding:16px;font-size:12px;color:#e2e8f0;background:#1e293b;border-radius:8px;overflow:auto;max-height:80vh">${tsxFiles.map(f => `// ${f.path}\n${f.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`).join('\n\n')}</pre>`
    : '<p style="color:#94a3b8;text-align:center;margin-top:40px">No preview available for these file types</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:16px}
${css}
</style>
</head><body>
<div id="root">${js ? '' : codePreview}</div>
${js ? `<script>${js}</script>` : ''}
</body></html>`;
}

const LivePreview: React.FC<LivePreviewProps> = ({ files, projectId }) => {
  const html = useMemo(() => buildPreviewHTML(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary/30">
        <div className="text-center">
          <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground">{projectId ? `app/${projectId.slice(0, 8)}` : "Preview"}</span>
        <button className="p-1 rounded hover:bg-accent transition-colors">
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <iframe
        srcDoc={html}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-modals"
        title="Live Preview"
        style={{ minHeight: "200px" }}
      />
    </div>
  );
};

export default LivePreview;
