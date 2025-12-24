import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Palette, Type, Sparkles } from "lucide-react";

interface QuoteMakerProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (quoteData: QuoteData) => void;
}

export interface QuoteData {
  text: string;
  author: string;
  style: "minimal" | "gradient" | "dark" | "elegant";
}

const styles = [
  { id: "minimal", name: "Minimal", preview: "bg-background border border-border" },
  { id: "gradient", name: "Gradient", preview: "bg-gradient-to-br from-foreground/5 to-foreground/10" },
  { id: "dark", name: "Dark", preview: "bg-foreground" },
  { id: "elegant", name: "Elegant", preview: "bg-background border-2 border-foreground/20" },
];

const QuoteMaker: React.FC<QuoteMakerProps> = ({ isOpen, onClose, onGenerate }) => {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [style, setStyle] = useState<QuoteData["style"]>("minimal");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    onGenerate({ text, author, style });
    setIsGenerating(false);
    setText("");
    setAuthor("");
    onClose();
  };

  const getPreviewStyle = () => {
    switch (style) {
      case "minimal":
        return "bg-card border border-border text-foreground";
      case "gradient":
        return "bg-gradient-to-br from-muted to-accent text-foreground";
      case "dark":
        return "bg-foreground text-background";
      case "elegant":
        return "bg-card border-2 border-foreground/30 text-foreground";
      default:
        return "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Quote Maker</h2>
                  <p className="text-sm text-foreground-muted">Create beautiful quotes</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Quote Text */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Type className="w-4 h-4" />
                  Quote Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your inspirational quote..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground/30 resize-none"
                />
              </div>

              {/* Author */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Author (optional)
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Who said this?"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground/30"
                />
              </div>

              {/* Style Selector */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Palette className="w-4 h-4" />
                  Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {styles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id as QuoteData["style"])}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        style === s.id
                          ? "border-foreground"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <div className={`h-8 rounded-lg mb-2 ${s.preview}`} />
                      <span className="text-xs text-foreground-muted">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {text && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Preview
                  </label>
                  <div className={`p-6 rounded-xl ${getPreviewStyle()}`}>
                    <p className="text-lg font-medium italic mb-2">"{text}"</p>
                    {author && (
                      <p className="text-sm opacity-70">— {author}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || isGenerating}
                className="flex-1 py-3 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Create Quote
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuoteMaker;
