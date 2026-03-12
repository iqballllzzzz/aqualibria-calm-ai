import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, BookOpen, Globe, Youtube, Sparkles, PenTool } from "lucide-react";

interface ResearchIndicatorProps {
  isLoading: boolean;
}

const RESEARCH_STAGES = [
  { icon: Brain, label: "Menganalisis pertanyaan...", duration: 2000 },
  { icon: Search, label: "Mencari di berbagai sumber...", duration: 2500 },
  { icon: Globe, label: "Menelusuri Wikipedia, Google Scholar...", duration: 3000 },
  { icon: Youtube, label: "Memeriksa YouTube, Reddit...", duration: 2500 },
  { icon: BookOpen, label: "Membaca dan memverifikasi data...", duration: 3000 },
  { icon: Sparkles, label: "Menyusun hasil riset...", duration: 2000 },
  { icon: PenTool, label: "Menulis jawaban lengkap...", duration: 4000 },
];

const ResearchIndicator: React.FC<ResearchIndicatorProps> = ({ isLoading }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (!isLoading) { setCurrentStage(0); return; }

    let stageIndex = 0;
    setCurrentStage(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;
    for (let i = 0; i < RESEARCH_STAGES.length - 1; i++) {
      accumulated += RESEARCH_STAGES[i].duration;
      timers.push(setTimeout(() => {
        stageIndex = i + 1;
        setCurrentStage(stageIndex);
      }, accumulated));
    }

    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  if (!isLoading) return null;

  const stage = RESEARCH_STAGES[currentStage];
  const Icon = stage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex justify-start px-1"
    >
      <div className="flex flex-col gap-2 py-3 px-4 rounded-3xl bg-card border border-primary/20 shadow-sm max-w-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Icon className="w-4 h-4 text-primary" />
              </motion.div>
            </AnimatePresence>
            <motion.div
              className="absolute -inset-1.5 rounded-full border border-primary/25"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.span
              key={stage.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="text-foreground-muted text-xs font-medium"
            >
              {stage.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {RESEARCH_STAGES.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= currentStage ? "bg-primary" : "bg-border"
              }`}
              animate={i === currentStage ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Sites being searched */}
        <div className="flex flex-wrap gap-1">
          {["Wikipedia", "Google", "YouTube", "Reddit", "StackOverflow"].slice(0, Math.min(currentStage + 1, 5)).map((site, i) => (
            <motion.span
              key={site}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
            >
              {site}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ResearchIndicator;
