import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

function buildFullHtml(files: any[]): string {
  const htmlFile = files.find((f: any) => f.path?.endsWith("index.html") || f.path?.endsWith(".html"));
  const cssFiles = files.filter((f: any) => f.path?.endsWith(".css"));
  const jsFiles = files.filter((f: any) => f.path?.endsWith(".js"));

  if (htmlFile) {
    let html = htmlFile.content || "";
    const css = cssFiles.map((f: any) => f.content).join("\n");
    const js = jsFiles.map((f: any) => f.content).join("\n");
    if (css && !html.includes("<style>")) {
      html = html.replace("</head>", `<style>${css}</style></head>`);
    }
    if (js && !html.includes("<script>")) {
      html = html.replace("</body>", `<script>${js}</script></body>`);
    }
    return html;
  }

  const css = cssFiles.map((f: any) => f.content).join("\n");
  const js = jsFiles.map((f: any) => f.content).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
}

const PublishedApp: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("agent_projects")
        .select("files, preview_html, title")
        .eq("published_url", slug)
        .eq("is_published", true)
        .single();
      if (err || !data) {
        setError("Project not found or not published.");
        setLoading(false);
        return;
      }
      const files = Array.isArray(data.files) ? data.files : [];
      const builtHtml = data.preview_html || buildFullHtml(files);
      setHtml(builtHtml);
      if (data.title) document.title = data.title as string;
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html || ""}
      className="w-screen h-screen border-0"
      sandbox="allow-scripts allow-modals allow-forms allow-popups"
      title="Published App"
    />
  );
};

export default PublishedApp;
