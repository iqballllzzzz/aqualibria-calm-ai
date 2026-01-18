import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Wand2, Loader2, Download, RotateCcw, Image as ImageIcon } from "lucide-react";
import { editImageLatentLeaf, uploadImage } from "@/lib/api";
import { getSubscription, getImageEditSession, updateImageEditSession } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LatentLeafModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LatentLeafModal: React.FC<LatentLeafModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageUrl, setImageUrl] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<{ prompt: string; resultUrl: string }[]>([]);
  
  const subscription = getSubscription();
  const canUse = subscription.plan === "senior" || subscription.plan === "superior";

  // Load previous session
  useEffect(() => {
    if (isOpen) {
      const session = getImageEditSession();
      if (session) {
        setImageUrl(session.lastImageUrl);
        setEditHistory(session.editHistory.map(h => ({ prompt: h.prompt, resultUrl: h.resultUrl })));
      }
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const result = await uploadImage(file);
    setIsUploading(false);

    if (result.success && result.imageUrl) {
      setImageUrl(result.imageUrl);
      setEditHistory([]);
      setResultUrl(null);
      toast({ title: "Gambar siap", description: "Tulis prompt untuk mengedit gambar" });
    } else {
      toast({ title: "Upload gagal", description: result.error, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = async () => {
    if (!imageUrl || !prompt.trim()) {
      toast({ title: "Error", description: "Masukkan gambar dan prompt", variant: "destructive" });
      return;
    }

    setIsEditing(true);
    
    // Use the last result URL if available (for continuous editing), otherwise use original
    const urlToEdit = resultUrl || imageUrl;
    
    const result = await editImageLatentLeaf(prompt.trim(), urlToEdit);
    setIsEditing(false);

    if (result.success && result.editedImageUrl) {
      setResultUrl(result.editedImageUrl);
      
      // Save to session
      updateImageEditSession(imageUrl, prompt, result.editedImageUrl);
      
      // Add to local history
      setEditHistory(prev => [...prev, { prompt, resultUrl: result.editedImageUrl! }]);
      setPrompt("");
      
      toast({ title: "Berhasil!", description: "Gambar telah diedit" });
    } else {
      toast({ title: "Edit gagal", description: result.error, variant: "destructive" });
    }
  };

  const handleReset = () => {
    setResultUrl(null);
  };

  const handleDownload = () => {
    if (resultUrl) {
      window.open(resultUrl, "_blank");
    }
  };

  if (!canUse) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              LatentLeaf Image Edit
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Fitur Eksklusif</h3>
            <p className="text-foreground-muted text-sm mb-4">
              LatentLeaf Image Edit tersedia untuk plan Senior dan Superior.
            </p>
            <p className="text-purple-500 text-sm font-medium">
              Upgrade plan Anda untuk mengakses fitur ini!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            LatentLeaf Image Edit
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
              EXCLUSIVE
            </span>
          </DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="space-y-6 py-4">
          {/* Image Upload / Display */}
          {!imageUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <span className="text-foreground-muted">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-foreground-muted" />
                  <span className="text-foreground-muted">Klik untuk upload gambar</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Images Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original Image */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Original</label>
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="w-full h-48 object-contain bg-black/20"
                    />
                    <button
                      onClick={() => {
                        setImageUrl("");
                        setResultUrl(null);
                        setEditHistory([]);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </div>

                {/* Result Image */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Result</label>
                  <div className="relative rounded-xl overflow-hidden border border-border h-48 flex items-center justify-center bg-black/10">
                    {resultUrl ? (
                      <>
                        <img
                          src={resultUrl}
                          alt="Edited"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button
                            onClick={handleReset}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                            title="Reset ke original"
                          >
                            <RotateCcw className="w-4 h-4 text-foreground" />
                          </button>
                          <button
                            onClick={handleDownload}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-foreground-muted text-sm">
                        {isEditing ? "Processing..." : "Result akan muncul di sini"}
                      </span>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit History */}
              {editHistory.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Edit History</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {editHistory.map((edit, index) => (
                      <button
                        key={index}
                        onClick={() => setResultUrl(edit.resultUrl)}
                        className="shrink-0 p-2 rounded-lg border border-border hover:border-purple-500 transition-colors"
                        title={edit.prompt}
                      >
                        <img
                          src={edit.resultUrl}
                          alt={`Edit ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-sm text-foreground-muted">
                  Prompt (deskripsikan perubahan yang diinginkan)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    placeholder="Contoh: make it sunset, add rain, change background to forest..."
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleEdit}
                    disabled={isEditing || !prompt.trim()}
                    className="px-6 py-3 rounded-xl btn-gradient-purple disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isEditing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wand2 className="w-5 h-5" />
                    )}
                    Edit
                  </button>
                </div>
              </div>

              <p className="text-xs text-foreground-muted">
                💡 Tip: Anda bisa terus mengedit gambar yang sama. Prompt baru akan diterapkan ke hasil sebelumnya.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LatentLeafModal;
