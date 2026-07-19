"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const TIMER_CONFIG = {
  INTERVAL: 1000,
} as const;

const DIMENSIONS = {
  CARD_HEIGHT: "150px",
  FADE_HEIGHT: "36px",
} as const;

function useElapsedTimer(isRunning: boolean) {
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      setTimer(0);
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, TIMER_CONFIG.INTERVAL);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  return timer;
}

// Auto-scrolls to the bottom as new content streams in (real content, not a fixed loop).
function useAutoScrollToBottom(contentRef: React.RefObject<HTMLDivElement | null>, content: string) {
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const id = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 30);
    return () => clearTimeout(id);
  }, [content, contentRef]);
}

interface ThinkingHeaderProps {
  timer: number;
  isThinking: boolean;
  label: string;
}

function ThinkingHeader({ timer, isThinking, label }: ThinkingHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {isThinking && <Spinner aria-hidden="true" className="size-4 text-primary" />}
      <span
        className={cn(
          "relative inline-block text-sm font-medium",
          isThinking ? "animate-pulse text-foreground" : "text-foreground-muted"
        )}
      >
        {label}
      </span>
      <span aria-label={`${timer} detik`} className="text-foreground-muted text-xs">
        {timer}s
      </span>
    </div>
  );
}

function FadeOverlay({ position }: { position: "top" | "bottom" }) {
  const isTop = position === "top";
  const gradientClass = isTop
    ? "bg-gradient-to-b from-card from-10% to-transparent"
    : "bg-gradient-to-t from-card from-10% to-transparent";
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 z-10", gradientClass)}
      style={{ [isTop ? "top" : "bottom"]: 0, height: DIMENSIONS.FADE_HEIGHT }}
    />
  );
}

interface AIThinkingProps {
  content: string;
  isThinking: boolean;
  label?: string;
  className?: string;
}

export default function AIThinking({ content, isThinking, label, className }: AIThinkingProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const timer = useElapsedTimer(isThinking);
  useAutoScrollToBottom(contentRef, content);

  if (!content && !isThinking) return null;

  return (
    <div className={cn("flex w-full max-w-xl flex-col gap-2 mb-2", className)}>
      <ThinkingHeader
        timer={timer}
        isThinking={isThinking}
        label={label || (isThinking ? "AquaLibriaAI sedang berpikir..." : "AquaLibriaAI selesai berpikir")}
      />
      {content && (
        <Card
          className="relative overflow-hidden rounded-xl p-2 shadow-xs bg-secondary/40 border-border"
          style={{ height: DIMENSIONS.CARD_HEIGHT }}
        >
          <FadeOverlay position="top" />
          <FadeOverlay position="bottom" />
          <div
            aria-label="Proses berpikir AI"
            aria-live="polite"
            className="h-full overflow-y-auto p-3 text-foreground-muted custom-scrollbar"
            ref={contentRef}
          >
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{content}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
