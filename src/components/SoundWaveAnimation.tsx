import React from "react";
import { motion } from "framer-motion";

interface SoundWaveAnimationProps {
  isActive: boolean;
  className?: string;
  barCount?: number;
  size?: "sm" | "md" | "lg";
}

const SoundWaveAnimation: React.FC<SoundWaveAnimationProps> = ({
  isActive,
  className = "",
  barCount = 5,
  size = "sm",
}) => {
  const sizeConfig = {
    sm: { height: 20, barWidth: "w-0.5", gap: "gap-0.5", minHeight: 6, maxHeight: 16 },
    md: { height: 32, barWidth: "w-1", gap: "gap-1", minHeight: 8, maxHeight: 24 },
    lg: { height: 80, barWidth: "w-2", gap: "gap-1.5", minHeight: 16, maxHeight: 64 },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${config.gap} ${className}`} style={{ height: config.height }}>
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.div
          key={index}
          className={`${config.barWidth} bg-current rounded-full`}
          animate={
            isActive
              ? {
                  height: [
                    `${config.minHeight}px`,
                    `${config.maxHeight}px`,
                    `${config.minHeight + (config.maxHeight - config.minHeight) * 0.4}px`,
                    `${config.maxHeight * 0.8}px`,
                    `${config.minHeight}px`,
                  ],
                }
              : { height: `${config.minHeight}px` }
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
