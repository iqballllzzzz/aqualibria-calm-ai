import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Status = "idle" | "running" | "ok" | "fail";
interface TestResult { status: Status; detail?: string; ms?: number }

const TESTS: { id: string; name: string; run: () => Promise<string> }[] = [
  {
    id: "chat", name: "Chat API (gemini-chat)",
    run: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: "Balas satu kata: OK" }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      return `respons ${t.length} char`;
    },
  },
  {
    id: "image-analysis", name: "Image Analysis (gemini-chat vision)",
    run: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: [
            { type: "text", text: "Warna apa gambar ini? Jawab 1 kata." },
            { type: "image_url", image_url: { url: "https://placehold.co/64x64/ff0000/ff0000.png" } },
          ]}],
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return "OK";
    },
  },
  {
    id: "research", name: "Research Mode (auto-search)",
    run: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/auto-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ query: "AqualibriaAI" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return "OK";
    },
  },
  {
    id: "storage", name: "Storage (bucket user-images)",
    run: async () => {
      const { error } = await supabase.storage.from("user-images").list("", { limit: 1 });
      if (error) throw error;
      return "bucket reachable";
    },
  },
  {
    id: "image-gen", name: "Image Generation (gemini-chat image)",
    run: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ mode: "image", prompt: "a small blue circle on white background" }),
      });
      if (!r.ok && r.status !== 400) throw new Error(`HTTP ${r.status}`);
      return `HTTP ${r.status}`;
    },
  },
];

export default function TestAi() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);

  const runOne = async (t: typeof TESTS[number]) => {
    setResults((r) => ({ ...r, [t.id]: { status: "running" } }));
    const start = Date.now();
    try {
      const detail = await t.run();
      setResults((r) => ({ ...r, [t.id]: { status: "ok", detail, ms: Date.now() - start } }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [t.id]: { status: "fail", detail: e?.message || String(e), ms: Date.now() - start } }));
    }
  };

  const runAll = async () => {
    setRunning(true);
    for (const t of TESTS) await runOne(t);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/status" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Status
          </Link>
          <Button size="sm" onClick={runAll} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Jalankan semua
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Test AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verifikasi cepat semua endpoint AI wajib. Klik salah satu untuk test individual.
          </p>
        </div>

        <Card className="p-2 divide-y divide-border">
          {TESTS.map((t) => {
            const r = results[t.id];
            const s = r?.status ?? "idle";
            return (
              <button
                key={t.id} onClick={() => runOne(t)} disabled={s === "running"}
                className="w-full text-left flex items-start gap-3 p-3 hover:bg-muted/40 rounded-md disabled:opacity-60"
              >
                <div className="mt-0.5">
                  {s === "ok" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {s === "fail" && <XCircle className="w-5 h-5 text-red-500" />}
                  {s === "running" && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                  {s === "idle" && <div className="w-5 h-5 rounded-full border border-border" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{t.name}</div>
                  {r?.detail && (
                    <div className={`text-xs mt-0.5 break-all ${s === "fail" ? "text-red-400" : "text-muted-foreground"}`}>
                      {r.detail} {r.ms != null && `· ${r.ms}ms`}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </Card>

        <p className="text-xs text-muted-foreground">
          Fitur "Spotify" tidak terpasang di project ini — dilewati. Jika perlu, hubungkan integrasi Spotify dulu.
        </p>
      </div>
    </div>
  );
}