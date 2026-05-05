import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2, Download } from "lucide-react";

interface Props {
  images: string[] | null;
  initialIndex?: number;
  onClose: () => void;
}

const SlideDeckViewer: React.FC<Props> = ({ images, initialIndex = 0, onClose }) => {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!images) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min((images?.length ?? 1) - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images, onClose]);

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const download = async () => {
    if (!images) return;
    const url = images[index];
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide-${index + 1}.png`;
      a.click();
    } catch {}
  };

  if (!images || images.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
          <span className="text-sm font-bold">{index + 1} / {images.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={download} className="p-2 rounded-xl hover:bg-white/10" aria-label="Download">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={goFullscreen} className="p-2 rounded-xl hover:bg-white/10" aria-label="Fullscreen">
              <Maximize2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide */}
        <div className="flex-1 flex items-center justify-center relative px-4">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <motion.img
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            src={images[index]}
            alt={`Slide ${index + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />

          <button
            onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
            disabled={index === images.length - 1}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Indicator dots */}
        <div className="flex items-center justify-center gap-2 py-4 shrink-0">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`transition-all rounded-full ${
                i === index ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SlideDeckViewer;