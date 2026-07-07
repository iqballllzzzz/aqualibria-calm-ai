import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Let the static boot screen know the React entrypoint executed. This avoids
// an endless spinner if a provider suspends, redirects, or renders slowly.
window.dispatchEvent(new Event("aqua:react-started"));
