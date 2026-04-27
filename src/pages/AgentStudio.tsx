import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FolderTree, Code, Eye, Terminal as TerminalIcon, MessageSquare, Plus, Loader2 } from "lucide-react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";
import FileExplorer, { type ProjectFile } from "@/components/agent/FileExplorer";
import MonacoEditor from "@/components/agent/MonacoEditor";
import XtermTerminal from "@/components/agent/XtermTerminal";
import SandpackPreview from "@/components/agent/SandpackPreview";
import AgentChat from "@/components/agent/AgentChat";
import LivePreview from "@/components/agent/LivePreview";
import {
  createProject,
  listFiles,
  readFile,
  writeFile,
  type AgentEvent,
} from "@/lib/agentApi";
import { useToast } from "@/hooks/use-toast";

type RightTab = "preview" | "terminal";
type PreviewMode = "sandpack" | "iframe";

const AgentStudio: React.FC = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { toast } = useToast();

  const [projectId, setProjectId] = useState<string | null>(routeProjectId ?? null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("sandpack");
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureProject = useCallback(async () => {
    if (projectId) return projectId;
    setCreating(true);
    try {
      const proj = await createProject("Untitled Project");
      setProjectId(proj.id);
      navigate(`/studio/${proj.id}`, { replace: true });
      return proj.id;
    } catch (err) {
      toast({
        title: "Backend unreachable",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [projectId, navigate, toast]);

  useEffect(() => {
    if (!routeProjectId) {
      void ensureProject();
    }
  }, [routeProjectId, ensureProject]);

  const refreshFiles = useCallback(async () => {
    if (!projectId) return;
    setLoadingFiles(true);
    try {
      const list = await listFiles(projectId);
      const fileEntries: ProjectFile[] = [];
      for (const f of list) {
        if (f.isDir) continue;
        try {
          const content = await readFile(projectId, f.path);
          fileEntries.push({ path: f.path, content });
        } catch {
          fileEntries.push({ path: f.path, content: "" });
        }
      }
      setFiles(fileEntries);
      if (!selectedPath && fileEntries.length > 0) {
        setSelectedPath(fileEntries[0].path);
      }
    } catch (err) {
      toast({
        title: "Failed to load files",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoadingFiles(false);
    }
  }, [projectId, selectedPath, toast]);

  useEffect(() => {
    if (projectId) void refreshFiles();
  }, [projectId, refreshFiles]);

  const selectedFile = useMemo(
    () => files.find((f) => f.path === selectedPath) ?? null,
    [files, selectedPath],
  );

  const onEditorChange = (next: string) => {
    if (!selectedFile || !projectId) return;
    setFiles((prev) =>
      prev.map((f) => (f.path === selectedFile.path ? { ...f, content: next } : f)),
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSavingPath(selectedFile.path);
    saveTimer.current = setTimeout(async () => {
      try {
        await writeFile(projectId, selectedFile.path, next);
      } catch (err) {
        toast({
          title: "Save failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setSavingPath(null);
      }
    }, 500);
  };

  const onAgentEvent = useCallback(
    (ev: AgentEvent) => {
      if (ev.type === "tool_result" && ev.result.ok) {
        const t = ev.call.tool;
        if (t === "write_file" || t === "delete_file" || t === "run_cmd") {
          void refreshFiles();
        }
      }
    },
    [refreshFiles],
  );

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {creating ? (
          <div className="flex items-center gap-2 text-foreground-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> creating project...
          </div>
        ) : (
          <button
            onClick={() => void ensureProject()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-12 surface-glass border-b border-border/60 flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => navigate("/chat")}
          className="p-1.5 rounded-xl hover:bg-accent transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="font-display font-bold text-sm">Master Architect Studio</div>
        <span className="text-[10px] text-foreground-muted font-mono">{projectId}</span>
        <div className="ml-auto flex items-center gap-2">
          {savingPath ? (
            <span className="text-[10px] text-foreground-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> saving {savingPath}...
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={18} minSize={12} className="border-r border-border bg-card/50">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-foreground-muted">
                <span className="flex items-center gap-1">
                  <FolderTree className="w-3 h-3" /> Files
                </span>
                {loadingFiles ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                <FileExplorer
                  files={files}
                  selectedPath={selectedPath}
                  onSelectFile={(f) => setSelectedPath(f.path)}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 transition-colors" />

          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={20} className="border-b border-border">
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 px-2 py-1 border-b border-border text-[11px] text-foreground-muted">
                    <Code className="w-3 h-3" />
                    <span className="font-mono">{selectedFile?.path ?? "—"}</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    {selectedFile ? (
                      <MonacoEditor
                        path={selectedFile.path}
                        value={selectedFile.content}
                        onChange={onEditorChange}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-foreground-muted">
                        Select a file or ask the agent to create one.
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="h-1 bg-border hover:bg-primary/40 transition-colors" />
              <Panel defaultSize={30} minSize={10}>
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-border">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRightTab("preview")}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                          rightTab === "preview" ? "bg-primary/15 text-primary" : "text-foreground-muted hover:bg-accent"
                        }`}
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                      <button
                        onClick={() => setRightTab("terminal")}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                          rightTab === "terminal" ? "bg-primary/15 text-primary" : "text-foreground-muted hover:bg-accent"
                        }`}
                      >
                        <TerminalIcon className="w-3 h-3" /> Terminal
                      </button>
                    </div>
                    {rightTab === "preview" ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewMode("sandpack")}
                          className={`px-2 py-0.5 rounded-md text-[10px] ${
                            previewMode === "sandpack" ? "bg-secondary text-foreground" : "text-foreground-muted"
                          }`}
                        >
                          Sandpack
                        </button>
                        <button
                          onClick={() => setPreviewMode("iframe")}
                          className={`px-2 py-0.5 rounded-md text-[10px] ${
                            previewMode === "iframe" ? "bg-secondary text-foreground" : "text-foreground-muted"
                          }`}
                        >
                          HTML
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1 min-h-0 bg-black">
                    {rightTab === "preview" ? (
                      previewMode === "sandpack" ? (
                        <SandpackPreview files={files} />
                      ) : (
                        <LivePreview files={files} projectId={projectId} />
                      )
                    ) : (
                      <XtermTerminal projectId={projectId} className="h-full w-full p-1" />
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 transition-colors" />

          <Panel defaultSize={32} minSize={20} className="border-l border-border bg-card/50">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-foreground-muted">
                <MessageSquare className="w-3 h-3" /> Agent
              </div>
              <div className="flex-1 min-h-0">
                <AgentChat projectId={projectId} onToolEvent={onAgentEvent} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default AgentStudio;
