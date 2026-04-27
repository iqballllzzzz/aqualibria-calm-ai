import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, ExternalLink, FolderOpen, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

interface Project {
  id: string;
  title: string;
  description: string | null;
  agent_type: string;
  is_published: boolean;
  published_url: string | null;
  created_at: string;
  updated_at: string;
  files: any[];
  preview_html: string | null;
}

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_projects")
      .select("*")
      .eq("user_id", user!.uid)
      .order("updated_at", { ascending: false });
    if (!error && data) {
      setProjects(data.map((p: any) => ({
        ...p,
        files: Array.isArray(p.files) ? p.files : [],
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("agent_projects").delete().eq("id", id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
      toast({ title: "Project deleted" });
    } else {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
    setDeleting(null);
  };

  const handlePublish = async (project: Project) => {
    setPublishing(project.id);
    const slug = project.published_url || crypto.randomUUID().slice(0, 12);
    const { error } = await supabase
      .from("agent_projects")
      .update({ is_published: true, published_url: slug } as any)
      .eq("id", project.id);
    if (!error) {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: true, published_url: slug } : p));
      const url = `${window.location.origin}/app/${slug}`;
      try { await navigator.clipboard.writeText(url); } catch {}
      toast({ title: "Published!", description: `Link copied: ${url}` });
    } else {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    }
    setPublishing(null);
  };

  const getPreviewThumbnail = (project: Project) => {
    const html = project.preview_html || project.files?.find((f: any) => f.path?.endsWith(".html"))?.content;
    if (!html) return null;
    return html;
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto relative">
      <div className="spotlight spotlight-violet" style={{ width: "44vw", height: "44vw", top: "-15%", left: "-15%", opacity: 0.16 }} />
      <div className="spotlight spotlight-cyan" style={{ width: "36vw", height: "36vw", bottom: "-10%", right: "-10%", opacity: 0.12 }} />

      {/* Header */}
      <header className="h-14 surface-glass sticky top-0 z-30 flex items-center justify-between px-4 border-b border-border/60">
        <button onClick={() => navigate("/chat")} className="p-2 rounded-2xl hover:bg-accent transition-colors" aria-label="Back to chat">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-display font-bold tracking-tight text-foreground">My Projects</span>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10 page-fade-in">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">No projects yet</p>
            <p className="text-muted-foreground text-xs mt-1">Use the Full-Stack Agent to create your first project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((project) => {
                const thumbnailHtml = getPreviewThumbnail(project);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Preview thumbnail */}
                    <div className="aspect-video bg-secondary relative overflow-hidden">
                      {thumbnailHtml ? (
                        <iframe
                          srcDoc={thumbnailHtml}
                          className="w-full h-full border-0 pointer-events-none"
                          sandbox="allow-scripts"
                          title={project.title}
                          style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", height: "200%" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="w-8 h-8 text-muted-foreground opacity-30" />
                        </div>
                      )}
                      {project.is_published && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Live
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-foreground truncate">{project.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {project.agent_type} · {(project.files as any[])?.length || 0} files · {new Date(project.updated_at).toLocaleDateString()}
                      </p>

                      <div className="flex items-center gap-1.5 mt-3">
                        <button
                          onClick={() => navigate(`/chat`, { state: { openProject: project.id } })}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Open
                        </button>
                        <button
                          onClick={() => handlePublish(project)}
                          disabled={publishing === project.id}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {publishing === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                          {project.is_published ? "Copy Link" : "Publish"}
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={deleting === project.id}
                          className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                        >
                          {deleting === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {project.is_published && project.published_url && (
                        <a
                          href={`/app/${project.published_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {window.location.origin}/app/{project.published_url}
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
