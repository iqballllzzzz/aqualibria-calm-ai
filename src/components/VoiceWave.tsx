import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type VoiceWaveState = "idle" | "listening" | "processing" | "speaking";

interface VoiceWaveProps {
  /** Per-dot amplitude, 0–1. Length determines the dot count. */
  levels: number[];
  state: VoiceWaveState;
  className?: string;
}

// A row of dots that bounce up and down. Both how FAR each dot travels and
// how FAST it bounces scale with the real audio amplitude for that band —
// louder / more energetic audio (AI speaking or user speaking) means bigger,
// quicker bounces; quiet moments settle into a slow, gentle idle drift.
export const VoiceWave = ({ levels, state, className }: VoiceWaveProps) => {
  const colorClass =
    state === "speaking"
      ? "bg-gradient-to-b from-indigo-500 to-blue-400"
      : state === "listening"
      ? "bg-gradient-to-b from-blue-500 to-purple-400"
      : state === "processing"
      ? "bg-gradient-to-b from-amber-500 to-amber-300"
      : "bg-muted-foreground/40";

  const isActive = state === "speaking" || state === "listening";

  return (
    <div className={cn("flex items-center justify-center gap-2.5 h-24 w-full max-w-[220px] mx-auto", className)}>
      {levels.map((level, i) => {
        const amplitude = isActive ? level : state === "processing" ? 0.25 + 0.15 * Math.sin(i) : 0.08;
        // Bigger movement range + shorter duration as amplitude rises.
        const travel = 6 + amplitude * 34; // px
        const duration = Math.max(0.12, 0.55 - amplitude * 0.4); // s
        const size = 8 + amplitude * 6; // px, dot grows slightly with loudness too

        return (
          <motion.span
            key={i}
            className={cn("rounded-full", colorClass)}
            style={{ width: size, height: size }}
            animate={
              state === "idle"
                ? { y: [0, -4, 0], opacity: [0.4, 0.6, 0.4] }
                : { y: [0, -travel, 0], opacity: [0.7, 1, 0.7] }
            }
            transition={{
              duration: state === "idle" ? 1.6 : duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.05,
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceWave;
