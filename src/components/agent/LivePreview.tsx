import React, { useMemo } from "react";
import { ProjectFile } from "./FileExplorer";
import { ExternalLink, Monitor } from "lucide-react";

interface LivePreviewProps {
  files: ProjectFile[];
  projectId?: string;
}

export function buildPreviewHTML(files: ProjectFile[]): string {
  const htmlFile = files.find(f => f.path.endsWith("index.html") || f.path.endsWith(".html"));
  const cssFiles = files.filter(f => f.path.endsWith(".css"));
  const jsFiles = files.filter(f => f.path.endsWith(".js") && !f.path.endsWith(".test.js"));
  const tsxFiles = files.filter(f => f.path.endsWith(".tsx") || f.path.endsWith(".jsx") || f.path.endsWith(".ts"));

  // Detect entry tsx/jsx (App.tsx or first tsx)
  const entryTsx = tsxFiles.find(f => /app\.(tsx|jsx)$/i.test(f.path)) || tsxFiles.find(f => /index\.(tsx|jsx)$/i.test(f.path)) || tsxFiles[0];

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
    const jsContent = jsFiles.map(f => f.content).join("\n");
    if (jsContent) {
      if (html.includes("</body>")) html = html.replace("</body>", `<script>${jsContent}</script></body>`);
      else html += `<script>${jsContent}</script>`;
    }
    return html;
  }

  const css = cssFiles.map(f => f.content).join("\n");

  // If we have a tsx/jsx entry → compile via Babel standalone with React from esm.sh
  if (entryTsx) {
    // Strip imports/exports so Babel-compiled code can run as a single script
    const sanitize = (code: string) =>
      code
        .replace(/^\s*import[^;]+;?\s*$/gm, "")
        .replace(/^\s*export\s+default\s+/gm, "const __default__ = ")
        .replace(/^\s*export\s+/gm, "");
    const combined = tsxFiles.map(f => `// ${f.path}\n${sanitize(f.content)}`).join("\n\n");
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>html,body,#root{height:100%;margin:0}body{font-family:system-ui,-apple-system,sans-serif}${css}</style>
</head><body><div id="root"></div>
<script type="text/babel" data-presets="env,react,typescript">
const { useState, useEffect, useRef, useMemo, useCallback, useReducer, Fragment } = React;
try {
${combined}
const Root = (typeof __default__ !== 'undefined') ? __default__ : (typeof App !== 'undefined' ? App : null);
if (Root) ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
else document.getElementById('root').innerHTML = '<div style="padding:24px;color:#94a3b8;font-family:monospace">No default export / App component found</div>';
} catch (err) {
  document.getElementById('root').innerHTML = '<pre style="padding:16px;color:#ef4444;white-space:pre-wrap;font-family:monospace;font-size:12px">'+(err && err.message ? err.message : String(err))+'</pre>';
}
</script></body></html>`;
  }

  // Fallback: pure html/css/js page from raw js files
  const js = jsFiles.map(f => f.content).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;padding:16px}${css}</style>
</head><body><div id="root"></div>${js ? `<script>${js}</script>` : ""}</body></html>`;
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
