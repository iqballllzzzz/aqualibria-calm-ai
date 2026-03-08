import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, PenTool, Sparkles, Zap } from "lucide-react";

interface SmartThinkingIndicatorProps {
  isLoading: boolean;
  messageComplexity?: "simple" | "medium" | "complex";
}

const STAGES_CONFIG = {
  simple: [
    { icon: Brain, label: "Thinking...", minDuration: 800 },
  ],
  medium: [
    { icon: Brain, label: "Analyzing...", minDuration: 1200 },
    { icon: Search, label: "Searching for information...", minDuration: 2000 },
    { icon: PenTool, label: "Composing response...", minDuration: 0 },
  ],
  complex: [
    { icon: Brain, label: "Analyzing your question...", minDuration: 1500 },
    { icon: Search, label: "Researching deeply...", minDuration: 2500 },
    { icon: Sparkles, label: "Processing data...", minDuration: 2000 },
    { icon: PenTool, label: "Composing detailed response...", minDuration: 0 },
  ],
};

const SmartThinkingIndicator: React.FC<SmartThinkingIndicatorProps> = ({
  isLoading,
  messageComplexity = "medium",
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const stages = STAGES_CONFIG[messageComplexity];

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      setElapsedTime(0);
      return;
    }

    startTimeRef.current = Date.now();
    setCurrentStage(0);
    setElapsedTime(0);

    // Elapsed time tracker
    const elapsed = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);

    // Stage advancement based on minimum durations
    let stageIndex = 0;
    const timers: NodeJS.Timeout[] = [];
    let accumulated = 0;

    for (let i = 0; i < stages.length - 1; i++) {
      accumulated += stages[i].minDuration;
      timers.push(setTimeout(() => {
        stageIndex = i + 1;
        setCurrentStage(stageIndex);
      }, accumulated));
    }

    return () => {
      clearInterval(elapsed);
      timers.forEach(clearTimeout);
    };
  }, [isLoading, messageComplexity]);

  if (!isLoading) return null;

  const stage = stages[currentStage];
  const Icon = stage.icon;
  const seconds = Math.floor(elapsedTime / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex justify-start px-1"
    >
      <div className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-accent/40 border border-border/50 backdrop-blur-sm">
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-4 h-4 text-primary" />
            </motion.div>
          </AnimatePresence>
          <motion.div
            className="absolute -inset-1.5 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={stage.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="text-foreground text-xs font-medium"
            >
              {stage.label}
            </motion.span>
          </AnimatePresence>
          {seconds > 0 && (
            <span className="text-[10px] text-muted-foreground">{seconds}s</span>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 ml-1">
          {stages.map((_, i) => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i <= currentStage ? "bg-primary" : "bg-muted-foreground/20"
              }`}
              animate={i === currentStage ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SmartThinkingIndicator;

// Utility to classify message complexity
export const classifyMessageComplexity = (message: string): "simple" | "medium" | "complex" => {
  const lower = message.toLowerCase().trim();
  
  // Simple: greetings, short messages
  const simplePatterns = [
    /^(hi|hello|hey|hai|halo|hola|yo|sup|thanks|thank you|ok|okay|yes|no|ya|tidak|iya|terima kasih|bye|goodbye|selamat)/i,
    /^.{0,25}$/,
  ];
  if (simplePatterns.some(p => p.test(lower))) return "simple";

  // Complex: long messages, analytical keywords, code
  const complexIndicators = [
    /\b(analyze|explain|compare|difference|why|how does|implement|architecture|design|debate|pros and cons|should i|which is better)\b/i,
    /\b(analisis|jelaskan|bandingkan|perbedaan|mengapa|bagaimana|implementasi|arsitektur|desain)\b/i,
    /```/,
    /\?.*\?/,
  ];
  const complexScore = complexIndicators.filter(p => p.test(lower)).length;
  if (complexScore >= 2 || message.length > 300) return "complex";
  if (complexScore >= 1 || message.length > 100) return "medium";
  
  return "medium";
};
