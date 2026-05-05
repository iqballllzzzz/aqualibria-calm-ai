import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Presentation, Code, Palette, Bot, ChevronRight } from "lucide-react";
import { getSubscription } from "@/lib/storage";

export type AgentMode = "slides" | "fullstack" | "design";

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AgentMode) => void;
  activeMode: AgentMode | null;
  slideCount?: 2 | 3 | 4;
  onSlideCountChange?: (n: 2 | 3 | 4) => void;
}

const AGENT_MODES = [
  {
    id: "slides" as AgentMode,
    name: "AI Slides",
    description: "Create professional presentations with AI",
    icon: Presentation,
    minPlan: "junior" as const,
  },
  {
    id: "fullstack" as AgentMode,
    name: "Full-Stack",
    description: "Build complete web apps with AI coding",
    icon: Code,
    minPlan: "junior" as const,
  },
  {
    id: "design" as AgentMode,
    name: "Design",
    description: "Generate UI/UX designs and mockups",
    icon: Palette,
    minPlan: "junior" as const,
  },
];

const AgentPanel: React.FC<AgentPanelProps> = ({ isOpen, onClose, onSelectMode, activeMode, slideCount = 4, onSlideCountChange }) => {
  const subscription = getSubscription();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-64 bg-popover border border-border rounded-3xl shadow-elevated z-[60] overflow-hidden p-2"
          >
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Agent Mode</span>
              </div>
            </div>

            <div className="space-y-1">
              {AGENT_MODES.map((mode) => {
                const isActive = activeMode === mode.id;
                const Icon = mode.icon;

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onSelectMode(mode.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left ${
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary/20" : "bg-accent"
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-foreground-muted"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{mode.name}</p>
                      <p className="text-[10px] text-foreground-muted truncate">{mode.description}</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-foreground-muted"}`} />
                  </button>
                );
              })}
            </div>

            {/* Slide count selector — visible when Slides agent active */}
            {activeMode === "slides" && onSlideCountChange && (
              <div className="mt-2 px-3 py-2 bg-accent/50 rounded-2xl">
                <p className="text-[10px] text-foreground-muted mb-1.5 font-semibold">Jumlah slide</p>
                <div className="flex gap-1">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={(e) => { e.stopPropagation(); onSlideCountChange(n as 2 | 3 | 4); }}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        slideCount === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-foreground-muted mt-1.5">{slideCount * 20} kredit / dek</p>
              </div>
            )}

            {/* Points info */}
            <div className="mt-2 px-3 py-2 bg-accent/50 rounded-2xl">
              <p className="text-[10px] text-foreground-muted">
                {subscription.plan === "junior" ? "Free: 5 pts/day" :
                 subscription.plan === "senior" ? "Senior: 20 pts/day" : "Superior: 45 pts/day"}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AgentPanel;
