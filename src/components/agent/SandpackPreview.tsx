import React, { useMemo } from "react";
import {
  Sandpack,
  type SandpackFiles,
  type SandpackPredefinedTemplate,
} from "@codesandbox/sandpack-react";
import type { ProjectFile } from "./FileExplorer";

interface Props {
  files: ProjectFile[];
}

function detectTemplate(files: ProjectFile[]): SandpackPredefinedTemplate {
  const paths = files.map((f) => f.path);
  if (paths.some((p) => p.endsWith(".tsx") || p.endsWith(".ts"))) {
    if (paths.some((p) => p.includes("vite.config"))) return "vite-react-ts";
    return "react-ts";
  }
  if (paths.some((p) => p.endsWith(".jsx") || p.endsWith(".js"))) {
    if (paths.some((p) => p.includes("vite.config"))) return "vite-react";
    if (paths.some((p) => p.endsWith("App.js") || p.endsWith("index.js"))) return "react";
  }
  return "static";
}

function toSandpackFiles(files: ProjectFile[]): SandpackFiles {
  const out: SandpackFiles = {};
  for (const f of files) {
    if (!f.path) continue;
    if (f.path.startsWith(".") && !f.path.startsWith("./")) continue;
    const key = f.path.startsWith("/") ? f.path : `/${f.path}`;
    out[key] = { code: f.content };
  }
  return out;
}

const SandpackPreview: React.FC<Props> = ({ files }) => {
  const template = useMemo(() => detectTemplate(files), [files]);
  const sbFiles = useMemo(() => toSandpackFiles(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-muted text-sm">
        No files yet — ask the agent to scaffold a project.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <Sandpack
        template={template}
        files={sbFiles}
        theme="dark"
        options={{
          showTabs: false,
          showLineNumbers: false,
          showInlineErrors: true,
          editorHeight: "100%",
          editorWidthPercentage: 0,
        }}
      />
    </div>
  );
};

export default SandpackPreview;
