import React from "react";
import { motion } from "framer-motion";

interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

/**
 * Page transition wrapper with a calm, editorial fade-up motion.
 * Use it as the outermost element of any page that wants the
 * "Calm Hotel" entrance feel.
 */
const MotionPage: React.FC<MotionPageProps> = ({ children, className = "" }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MotionPage;
