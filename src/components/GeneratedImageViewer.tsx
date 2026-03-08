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
        // Use no-cors proxy approach for cross-origin images
        try {
          const res = await fetch(imageUrl, { mode: "cors" });
          blob = await res.blob();
        } catch {
          // Fallback: create an image element and draw to canvas
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = imageUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/png")
          );
        }
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `aqua-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "Downloaded!", description: "Image saved successfully" });
    } catch {
      // Final fallback: open in new tab
      window.open(imageUrl, "_blank");
      toast({ title: "Download", description: "Image opened in new tab. Long-press to save." });
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
        className="fixed inset-0 bg-black/95 backdrop-blur-xl flex flex-col"
        style={{ zIndex: 9999 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <button onClick={onClose} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <ZoomOut className="w-4 h-4 text-white/80" />
            </button>
            <span className="text-xs text-white/70 font-bold px-2 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <ZoomIn className="w-4 h-4 text-white/80" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors" title="Share">
              <Share2 className="w-4 h-4 text-white/80" />
            </button>
            <button onClick={handleDownload} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors" title="Download">
              <Download className="w-4 h-4 text-white/80" />
            </button>
            {onEditImage && (
              <button
                onClick={() => setShowEditInput(!showEditInput)}
                className={`p-2.5 rounded-2xl transition-colors ${showEditInput ? "bg-blue-500 text-white" : "bg-white/10 hover:bg-white/20"}`}
                title="Edit image"
              >
                <Edit2 className="w-4 h-4 text-white/80" />
              </button>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.img
            src={imageUrl}
            alt="Generated"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
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
              className="shrink-0 p-4 bg-black/60 backdrop-blur-lg border-t border-white/10"
            >
              <div className="max-w-lg mx-auto flex gap-2">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                  placeholder="Describe how to edit this image..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400/60 text-sm"
                  autoFocus
                  disabled={isEditing}
                />
                <button
                  onClick={handleEdit}
                  disabled={isEditing || !editPrompt.trim()}
                  className="px-5 py-3 rounded-2xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2 hover:bg-blue-400 transition-colors"
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
