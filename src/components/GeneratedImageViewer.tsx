import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Edit2, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
  onEditImage?: (imageUrl: string, prompt: string) => void;
}

const GeneratedImageViewer: React.FC<GeneratedImageViewerProps> = ({ imageUrl, onClose, onEditImage }) => {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      let blob: Blob;
      if (imageUrl.startsWith("data:")) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `aqua-image-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Downloaded!", description: "Image saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to download image", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        let blob: Blob;
        if (imageUrl.startsWith("data:")) {
          const res = await fetch(imageUrl);
          blob = await res.blob();
        } else {
          const res = await fetch(imageUrl);
          blob = await res.blob();
        }
        const file = new File([blob], "aqua-image.png", { type: "image/png" });
        await navigator.share({ files: [file], title: "AquaLibria Generated Image" });
      } else {
        await navigator.clipboard.writeText(imageUrl.startsWith("data:") ? "Image (base64 - too large to share via clipboard)" : imageUrl);
        toast({ title: "Copied!", description: "Image link copied to clipboard" });
      }
    } catch {
      toast({ title: "Share cancelled", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !onEditImage) return;
    setIsEditing(true);
    try {
      await onEditImage(imageUrl, editPrompt.trim());
      setEditPrompt("");
      setShowEditInput(false);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/95 backdrop-blur-xl z-[60] flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <button onClick={onClose} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
              <ZoomOut className="w-4 h-4 text-foreground-muted" />
            </button>
            <span className="text-xs text-foreground-muted font-medium px-2">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
              <ZoomIn className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
              <Share2 className="w-4 h-4 text-foreground-muted" />
            </button>
            <button onClick={handleDownload} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
              <Download className="w-4 h-4 text-foreground-muted" />
            </button>
            {onEditImage && (
              <button onClick={() => setShowEditInput(!showEditInput)} className={`p-2.5 rounded-2xl transition-colors ${showEditInput ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.img
            src={imageUrl}
            alt="Generated"
            className="max-w-full max-h-full rounded-3xl shadow-elevated object-contain"
            style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease" }}
            draggable={false}
          />
        </div>

        {/* Edit input */}
        <AnimatePresence>
          {showEditInput && onEditImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="shrink-0 p-4 border-t border-border bg-card"
            >
              <div className="max-w-lg mx-auto flex gap-2">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                  placeholder="Describe how to edit this image..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-muted border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/40 text-sm"
                  autoFocus
                  disabled={isEditing}
                />
                <button
                  onClick={handleEdit}
                  disabled={isEditing || !editPrompt.trim()}
                  className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                  Edit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default GeneratedImageViewer;
