import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// The script tag executed — instantly clear stale recovery flags so a slow
// but eventually-successful boot never traps the user on the fallback UI.
try {
  sessionStorage.removeItem("aqua-recovered");
  sessionStorage.removeItem("aqua-chunk-recovered");
} catch { /* ignore */ }

// Global safety nets — prevent whitescreen on unhandled errors.
window.addEventListener("error", (e) => {
  console.error("[global error]", e.error || e.message);
  maybeRecoverFromStaleBuild(String(e.message || e.error || ""));
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandledrejection]", e.reason);
  maybeRecoverFromStaleBuild(String((e.reason && (e.reason.message || e.reason)) || ""));
});

// WHITESCREEN FIX: a stale PWA service worker can serve an old index.html whose
// hashed chunks no longer exist on the server. When a chunk fails to load,
// unregister SWs, clear caches, and reload ONCE.
let recovering = false;
async function maybeRecoverFromStaleBuild(msg: string) {
  const chunkError =
    /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|MIME type .* is not executable|Unexpected token '<'/i.test(msg);
  if (!chunkError || recovering) return;
  if (sessionStorage.getItem("aqua-chunk-recovered")) return;
  recovering = true;
  sessionStorage.setItem("aqua-chunk-recovered", "1");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}

// Clear one-shot recovery flags after a successful boot.
window.setTimeout(() => {
  try {
    if (document.getElementById("root")?.childNodes.length) {
      sessionStorage.removeItem("aqua-chunk-recovered");
      sessionStorage.removeItem("aqua-recovered");
    }
  } catch {
    /* ignore */
  }
}, 4000);

function renderFatalError(err: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const msg = err instanceof Error ? err.message : String(err);
  root.innerHTML =
    '<div style="font-family:system-ui;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:#0A0F1F;color:#F3F4F6">' +
    '<p style="margin:0;font-size:15px;max-width:360px">Gagal memuat aplikasi. Kemungkinan cache lama atau konfigurasi backend hilang.</p>' +
    '<pre style="margin:0;padding:10px 14px;background:rgba(255,255,255,.05);border-radius:8px;font-size:11px;max-width:340px;overflow:auto">' +
    msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!)) +
    "</pre>" +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
    '<button id="aqua-clear-cache" style="padding:10px 18px;border-radius:10px;border:none;background:#1E3A8A;color:#fff;font-size:14px">Bersihkan Cache</button>' +
    '<a href="/status?sw=off" style="padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.2);color:#F3F4F6;text-decoration:none;font-size:14px">Cek Backend</a>' +
    "</div></div>";
  const btn = document.getElementById("aqua-clear-cache");
  if (btn) btn.onclick = () => (window as any).__aquaHardRecover?.();
}

try {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
  // Let the static boot screen know React executed — removes spinner immediately.
  window.dispatchEvent(new Event("aqua:react-started"));
} catch (err) {
  console.error("[boot fatal]", err);
  renderFatalError(err);
  window.dispatchEvent(new Event("aqua:react-started"));
}
