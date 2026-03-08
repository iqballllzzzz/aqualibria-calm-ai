import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Shield, Check, ArrowRight } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface DualAgentViewProps {
  perspectiveA: string;
  perspectiveB: string;
  agentAName: string;
  agentBName: string;
  onSelect: (perspective: "A" | "B") => void;
}

const DualAgentView: React.FC<DualAgentViewProps> = ({
  perspectiveA,
  perspectiveB,
  agentAName,
  agentBName,
  onSelect,
}) => {
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [expanded, setExpanded] = useState<"A" | "B" | null>(null);

  const handleSelect = (choice: "A" | "B") => {
    setSelected(choice);
    onSelect(choice);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[90%] space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary">Dual Perspective Mode</span>
        </div>
        <span className="text-[10px] text-foreground-muted">Choose the viewpoint you prefer</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Agent A - Optimist */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
            selected === "A"
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-border hover:border-emerald-500/50 bg-card"
          }`}
          onClick={() => expanded === "A" ? setExpanded(null) : setExpanded("A")}
        >
          {/* Agent header */}
          <div className="flex items-center gap-2 p-3 pb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-foreground">{agentAName}</span>
              <p className="text-[10px] text-emerald-500 font-medium">Progressive View</p>
            </div>
            {selected === "A" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </div>
          
          {/* Content */}
          <div className={`px-3 pb-3 ${expanded === "A" ? "" : "max-h-32 overflow-hidden"}`}>
            <div className="text-sm">
              <MarkdownRenderer content={perspectiveA} />
            </div>
            {expanded !== "A" && perspectiveA.length > 200 && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>

          {/* Select button */}
          {!selected && (
            <div className="px-3 pb-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleSelect("A"); }}
                className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Choose this view</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Agent B - Realist */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
            selected === "B"
              ? "border-blue-500 bg-blue-500/5"
              : "border-border hover:border-blue-500/50 bg-card"
          }`}
          onClick={() => expanded === "B" ? setExpanded(null) : setExpanded("B")}
        >
          {/* Agent header */}
          <div className="flex items-center gap-2 p-3 pb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-foreground">{agentBName}</span>
              <p className="text-[10px] text-blue-500 font-medium">Analytical View</p>
            </div>
            {selected === "B" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </div>
          
          {/* Content */}
          <div className={`px-3 pb-3 ${expanded === "B" ? "" : "max-h-32 overflow-hidden"}`}>
            <div className="text-sm">
              <MarkdownRenderer content={perspectiveB} />
            </div>
            {expanded !== "B" && perspectiveB.length > 200 && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>

          {/* Select button */}
          {!selected && (
            <div className="px-3 pb-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleSelect("B"); }}
                className="w-full py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Choose this view</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DualAgentView;
