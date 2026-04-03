import React, { useState } from "react";
import { ChevronRight, ChevronDown, FileCode, FolderOpen, Folder } from "lucide-react";

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: FileTreeNode[];
  file?: ProjectFile;
}

function buildTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    let pathSoFar = "";
    for (let i = 0; i < parts.length; i++) {
      pathSoFar += (i > 0 ? "/" : "") + parts[i];
      const isLast = i === parts.length - 1;
      let node = current.find((n) => n.name === parts[i]);
      if (!node) {
        node = { name: parts[i], path: pathSoFar, isFolder: !isLast, children: [], file: isLast ? file : undefined };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

const LANG_COLORS: Record<string, string> = {
  tsx: "text-blue-400", jsx: "text-blue-400", ts: "text-blue-500", js: "text-yellow-400",
  css: "text-purple-400", html: "text-orange-400", json: "text-green-400", md: "text-foreground-muted",
  env: "text-foreground-muted", toml: "text-foreground-muted", config: "text-foreground-muted",
};

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

const TreeNode: React.FC<{ node: FileTreeNode; depth: number; selectedPath: string | null; onSelect: (file: ProjectFile) => void }> = ({ node, depth, selectedPath, onSelect }) => {
  const [open, setOpen] = useState(depth < 2);
  const ext = getExt(node.name);
  const colorClass = LANG_COLORS[ext] || "text-foreground-muted";

  if (node.isFolder) {
    return (
      <div>
        <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 py-1 px-1 hover:bg-accent/50 rounded-lg transition-colors text-left" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
          {open ? <ChevronDown className="w-3 h-3 text-foreground-muted shrink-0" /> : <ChevronRight className="w-3 h-3 text-foreground-muted shrink-0" />}
          {open ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <span className="text-xs text-foreground font-medium truncate">{node.name}</span>
        </button>
        {open && node.children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />)}
      </div>
    );
  }

  return (
    <button
      onClick={() => node.file && onSelect(node.file)}
      className={`w-full flex items-center gap-1.5 py-1 px-1 rounded-lg transition-colors text-left ${selectedPath === node.path ? "bg-primary/10 text-primary" : "hover:bg-accent/50"}`}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
    >
      <FileCode className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
      <span className="text-xs truncate">{node.name}</span>
    </button>
  );
};

const FileExplorer: React.FC<{ files: ProjectFile[]; selectedPath: string | null; onSelectFile: (file: ProjectFile) => void }> = ({ files, selectedPath, onSelectFile }) => {
  const tree = buildTree(files);
  return (
    <div className="py-1">
      {tree.map((node) => <TreeNode key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelectFile} />)}
    </div>
  );
};

export default FileExplorer;
