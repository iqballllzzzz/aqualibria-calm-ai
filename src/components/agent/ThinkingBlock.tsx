import React, { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingBlockProps {
  intent: string;
  plan: string[];
  isStreaming?: boolean;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ intent, plan, isStreaming }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-2xl border border-border bg-secondary/40 overflow-hidden"
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors">
        <Brain className={`w-3.5 h-3.5 ${isStreaming ? "text-primary animate-pulse" : "text-foreground-muted"}`} />
        <span className="text-[11px] font-bold text-foreground">{isStreaming ? "AI Thinking..." : "AI Thought Process"}</span>
        {expanded ? <ChevronDown className="w-3 h-3 text-foreground-muted ml-auto" /> : <ChevronRight className="w-3 h-3 text-foreground-muted ml-auto" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2.5 space-y-1.5">
              {intent && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold text-primary shrink-0 mt-0.5">Intent</span>
                  <span className="text-[11px] text-foreground-muted">{intent}</span>
                </div>
              )}
              {plan.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-primary">Plan</span>
                  <div className="mt-0.5 space-y-0.5">
                    {plan.map((step, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[10px] text-foreground-muted shrink-0 w-4 text-right">{i + 1}.</span>
                        <span className="text-[11px] text-foreground-muted">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isStreaming && <div className="w-2 h-3 bg-primary/50 rounded-sm animate-pulse" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ThinkingBlock;
