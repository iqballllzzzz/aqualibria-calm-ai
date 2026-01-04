import React from "react";
import { motion } from "framer-motion";

interface SoundWaveAnimationProps {
  isActive: boolean;
  className?: string;
  barCount?: number;
}

const SoundWaveAnimation: React.FC<SoundWaveAnimationProps> = ({
  isActive,
  className = "",
  barCount = 5,
}) => {
  return (
    <div className={`flex items-center justify-center gap-0.5 h-5 ${className}`}>
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.div
          key={index}
          className="w-1 bg-foreground rounded-full"
          animate={
            isActive
              ? {
                  height: ["8px", "20px", "12px", "18px", "8px"],
                }
              : { height: "8px" }
          }
          transition={
            isActive
              ? {
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.1,
                  ease: "easeInOut",
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
};

export default SoundWaveAnimation;
