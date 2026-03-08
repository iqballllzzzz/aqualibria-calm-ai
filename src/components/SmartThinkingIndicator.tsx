import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, PenTool, Sparkles } from "lucide-react";

interface SmartThinkingIndicatorProps {
  isLoading: boolean;
  messageComplexity?: "simple" | "medium" | "complex";
}

const STAGES = {
  simple: [
    { icon: Brain, label: "Thinking...", duration: 2000 },
  ],
  medium: [
    { icon: Brain, label: "Thinking...", duration: 1500 },
    { icon: Search, label: "Searching for information...", duration: 2500 },
    { icon: PenTool, label: "Composing response...", duration: 3000 },
  ],
  complex: [
    { icon: Brain, label: "Analyzing your question...", duration: 2000 },
    { icon: Search, label: "Researching deeply...", duration: 3000 },
    { icon: Sparkles, label: "Processing data...", duration: 2500 },
    { icon: PenTool, label: "Composing detailed response...", duration: 4000 },
  ],
};

const SmartThinkingIndicator: React.FC<SmartThinkingIndicatorProps> = ({
  isLoading,
  messageComplexity = "medium",
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const stages = STAGES[messageComplexity];

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      return;
    }

    let stageIndex = 0;
    setCurrentStage(0);

    const advanceStage = () => {
      if (stageIndex < stages.length - 1) {
        stageIndex++;
        setCurrentStage(stageIndex);
      }
    };

    const timers: NodeJS.Timeout[] = [];
    let accumulated = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      accumulated += stages[i].duration;
      timers.push(setTimeout(advanceStage, accumulated));
    }

    return () => timers.forEach(clearTimeout);
  }, [isLoading, messageComplexity]);

  if (!isLoading) return null;

  const stage = stages[currentStage];
  const Icon = stage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex justify-start px-1"
    >
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-accent/30 border border-border/50">
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
            className="absolute -inset-1 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
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

        {/* Progress dots */}
        <div className="flex items-center gap-1 ml-1">
          {stages.map((_, i) => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i <= currentStage ? "bg-primary" : "bg-muted-foreground/20"
              }`}
              animate={i === currentStage ? { scale: [1, 1.3, 1] } : {}}
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
  
  // Simple: greetings, short questions
  const simplePatterns = [
    /^(hi|hello|hey|hai|halo|hola|yo|sup|thanks|thank you|ok|okay|yes|no|ya|tidak|iya|terima kasih|bye|goodbye|selamat)/i,
    /^.{0,20}$/,
  ];
  if (simplePatterns.some(p => p.test(lower))) return "simple";

  // Complex: long messages, analytical keywords, code, multiple questions
  const complexIndicators = [
    /\b(analyze|explain|compare|difference|why|how does|implement|architecture|design|debate|pros and cons|should i|which is better)\b/i,
    /\b(analisis|jelaskan|bandingkan|perbedaan|mengapa|bagaimana|implementasi|arsitektur|desain)\b/i,
    /```/,
    /\?.*\?/, // Multiple questions
  ];
  const complexScore = complexIndicators.filter(p => p.test(lower)).length;
  if (complexScore >= 2 || message.length > 300) return "complex";
  if (complexScore >= 1 || message.length > 100) return "medium";
  
  return "medium";
};
