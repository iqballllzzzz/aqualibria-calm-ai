import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowLeft, RefreshCw, Trash2, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { probeBackend, setLastBackendProbe, type BackendProbe, type ProbeState } from "@/lib/backendStatus";

const label: Record<ProbeState, string> = {
  ok: "Aktif",
  degraded: "Berfungsi terbatas",
  down: "Tidak tersedia",
  checking: "Memeriksa…",
};

const Icon = ({ s }: { s: ProbeState }) => {
  if (s === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (s === "degraded") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  if (s === "down") return <XCircle className="w-5 h-5 text-red-500" />;
  return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
};

const Row = ({ name, state, hint }: { name: string; state: ProbeState; hint?: string }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
    <div className="min-w-0">
      <div className="font-medium">{name}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <Icon s={state} />
      <span className="text-sm">{label[state]}</span>
    </div>
  </div>
);

export default function BackendStatus() {
  const [probe, setProbe] = useState<BackendProbe>({
    auth: "checking", database: "checking", aiChat: "checking", storage: "checking",
    updatedAt: Date.now(),
  });
  const [busy, setBusy] = useState(false);
  const [sw, setSw] = useState<{ active: boolean; scriptURL?: string; caches: string[] }>({ active: false, caches: [] });

  const readSw = async () => {
    try {
      const regs = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      const active = regs.length > 0;
      const scriptURL = regs[0]?.active?.scriptURL;
      const caches = window.caches ? await window.caches.keys() : [];
      setSw({ active, scriptURL, caches });
    } catch { setSw({ active: false, caches: [] }); }
  };

  const run = async () => {
    setBusy(true);
    try {
      const p = await probeBackend();
      setProbe(p);
      setLastBackendProbe(p);
      await readSw();
    } finally { setBusy(false); }
  };

  useEffect(() => { run(); }, []);

  const anyDown = [probe.auth, probe.database, probe.aiChat, probe.storage].includes("down");
  const buildTime = import.meta.env.VITE_BUILD_TIME || "dev";
  const buildMode = import.meta.env.MODE;

  const clearCache = async () => {
    if (!confirm("Bersihkan service worker & cache lalu muat ulang?")) return;
    const fn = (window as any).__aquaHardRecover;
    if (fn) return fn();
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      }
      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      }
    } finally { location.reload(); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/chat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/test-ai"><TestTube2 className="w-4 h-4 mr-2" />Test AI</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={run} disabled={busy}>
              <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
              Periksa ulang
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Status Backend</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cek ketersediaan Lovable Cloud (database, auth, storage) dan gateway AI.
            Fitur AI akan otomatis dinonaktifkan bila gateway sedang tidak tersedia.
          </p>
        </div>

        <Card className="p-4">
          <Row name="Autentikasi" state={probe.auth} hint="Sesi pengguna & OTP email" />
          <Row name="Database" state={probe.database} hint="Baca/tulis metadata & preferensi" />
          <Row name="AI Gateway" state={probe.aiChat} hint="Rantai Gemini → BigPickle → OpenRouter" />
          <Row name="Storage" state={probe.storage} hint="Bucket gambar (user-images)" />
        </Card>

        <Card className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Build mode</span><span className="font-mono">{buildMode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Build time</span><span className="font-mono text-xs">{buildTime}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Service worker</span><span className="font-mono">{sw.active ? "aktif" : "nonaktif"}</span></div>
          {sw.scriptURL && <div className="text-xs text-muted-foreground truncate">↳ {sw.scriptURL}</div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Cache buckets</span><span className="font-mono">{sw.caches.length}</span></div>
          {sw.caches.length > 0 && <div className="text-xs text-muted-foreground break-all">{sw.caches.join(", ")}</div>}
          <Button size="sm" variant="destructive" className="w-full mt-2" onClick={clearCache}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear App Cache & Reload
          </Button>
        </Card>

        {anyDown && (
          <Card className="p-4 border-amber-500/40 bg-amber-500/5">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium mb-1">Beberapa layanan tidak tersedia.</div>
                <p className="text-muted-foreground">
                  Kami akan otomatis melewati fitur yang bergantung padanya. Coba lagi
                  dalam beberapa menit — Cloud biasanya kembali normal setelah restart.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground text-right">
          Diperbarui {new Date(probe.updatedAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}