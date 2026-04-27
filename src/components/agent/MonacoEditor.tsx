import React from "react";
import Editor from "@monaco-editor/react";

const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  md: "markdown",
  py: "python",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  toml: "ini",
  env: "ini",
};

function inferLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANG_BY_EXT[ext] ?? "plaintext";
}

interface Props {
  path: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  theme?: "vs-dark" | "light";
}

const MonacoEditor: React.FC<Props> = ({ path, value, onChange, readOnly, theme = "vs-dark" }) => {
  return (
    <Editor
      path={path}
      defaultLanguage={inferLang(path)}
      language={inferLang(path)}
      value={value}
      theme={theme}
      onChange={(v) => onChange(v ?? "")}
      options={{
        readOnly,
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        renderWhitespace: "selection",
        smoothScrolling: true,
        automaticLayout: true,
      }}
    />
  );
};

export default MonacoEditor;
