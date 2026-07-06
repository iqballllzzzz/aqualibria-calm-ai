import { Check, Loader2, AlertTriangle, XCircle } from "lucide-react";

export type StageStatus = "pending" | "active" | "ok" | "retry" | "failed" | "skipped";

export interface ThinkingStage {
  id: string;
  label: string;
  status: StageStatus;
  detail?: string;
}

const iconFor = (s: StageStatus) => {
  switch (s) {
    case "ok": return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case "active": return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    case "retry": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "skipped": return <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 inline-block" />;
    default: return <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 inline-block" />;
  }
};

export function ProgressiveThinking({
  stages,
  allFailed,
}: {
  stages: ThinkingStage[];
  allFailed?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
      <div className="font-medium text-muted-foreground mb-1">Proses AI</div>
      {stages.map((s) => (
        <div key={s.id} className="flex items-start gap-2">
          <div className="mt-0.5">{iconFor(s.status)}</div>
          <div className="flex-1 min-w-0">
            <div className={s.status === "failed" ? "text-red-500" : ""}>{s.label}</div>
            {s.detail && <div className="text-muted-foreground text-[11px]">{s.detail}</div>}
          </div>
        </div>
      ))}
      {allFailed && (
        <div className="mt-2 flex items-center gap-2 text-red-500">
          <XCircle className="w-3.5 h-3.5" />
          <span>Semua provider AI tidak merespons. Silakan coba lagi nanti.</span>
        </div>
      )}
    </div>
  );
}

// Helper factory for the standard 3-stage chain.
export const initialProviderStages = (): ThinkingStage[] => [
  { id: "gemini", label: "Gemini 3.5 Flash", status: "active", detail: "Mencoba provider utama…" },
  { id: "bigpickle", label: "BigPickle (OpenCode)", status: "pending" },
  { id: "openrouter", label: "OpenRouter fallback", status: "pending" },
];