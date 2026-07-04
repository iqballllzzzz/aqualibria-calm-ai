import React from "react";

interface State {
  hasError: boolean;
  message?: string;
  stack?: string;
}

/**
 * Top-level ErrorBoundary — prevents whitescreen when any provider,
 * lazy import, or child component throws during render.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message, stack: error?.stack };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console; edge-function logger can pick this up server-side later.
    console.error("[AquaLibriaAI] Render crash:", error, info?.componentStack);
    try {
      const payload = {
        provider: "client",
        time: new Date().toISOString(),
        endpoint: window.location.pathname,
        user_id: localStorage.getItem("aqua-user-id") || "anon",
        error_message: error?.message || String(error),
      };
      // Best-effort remote log, never throws.
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (url && key && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(`${url}/functions/v1/log-activity?apikey=${key}`, blob);
      }
    } catch {
      /* swallow — never let the boundary itself crash */
    }
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
  };

  reload = () => {
    try {
      // Common corrupted-storage keys that can cause reload loops.
      const keysToClear = ["aqua-chat-history", "aqua-ai-memory"];
      keysToClear.forEach((k) => {
        try {
          const v = localStorage.getItem(k);
          if (v && v.length > 4_500_000) localStorage.removeItem(k);
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xl">
            !
          </div>
          <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
          <p className="text-sm text-muted-foreground">
            Aplikasi mengalami error saat memuat. Silakan muat ulang halaman.
          </p>
          {this.state.message ? (
            <pre className="text-xs text-left bg-muted/40 rounded-md p-3 overflow-auto max-h-40">
              {this.state.message}
            </pre>
          ) : null}
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted"
            >
              Coba lagi
            </button>
            <button
              onClick={this.reload}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
            >
              Muat ulang
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;