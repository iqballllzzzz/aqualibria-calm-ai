import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Wand2, Loader2, Download, RotateCcw, Image as ImageIcon } from "lucide-react";
import { editImageLatentLeaf } from "@/lib/api";
import { getSubscription, getImageEditSession, updateImageEditSession, canUseLatentLeaf, incrementLatentLeafUsage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LatentLeafModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LatentLeafModal: React.FC<LatentLeafModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<{ prompt: string; resultUrl: string }[]>([]);
  const [usageInfo, setUsageInfo] = useState(canUseLatentLeaf());
  
  const subscription = getSubscription();

  // Update usage info when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsageInfo(canUseLatentLeaf());
      const session = getImageEditSession();
      if (session) {
        setImagePreview(session.lastImageUrl);
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

    // Store the file for later use with the API
    setImageFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setEditHistory([]);
    setResultUrl(null);
    
    toast({ title: "Gambar siap", description: "Tulis prompt untuk mengedit gambar" });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = async () => {
    if (!imageFile || !prompt.trim()) {
      toast({ title: "Error", description: "Masukkan gambar dan prompt", variant: "destructive" });
      return;
    }

    // Check usage limit
    const currentUsage = canUseLatentLeaf();
    if (!currentUsage.allowed) {
      toast({ 
        title: "Limit Tercapai", 
        description: "Limit harian tercapai. Reset besok pagi (WIB) atau upgrade plan.", 
        variant: "destructive" 
      });
      return;
    }

    setIsEditing(true);
    
    // Use the file directly with the new API
    const result = await editImageLatentLeaf(prompt.trim(), imageFile);
    setIsEditing(false);

    if (result.success && result.editedImageUrl) {
      // Increment usage for free users
      if (subscription.plan === "junior") {
        incrementLatentLeafUsage();
        setUsageInfo(canUseLatentLeaf());
      }
      
      setResultUrl(result.editedImageUrl);
      
      // Save to session
      updateImageEditSession(imagePreview, prompt, result.editedImageUrl);
      
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

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setResultUrl(null);
    setEditHistory([]);
  };

  // Show limit reached message for free users
  if (!usageInfo.allowed && !usageInfo.unlimited) {
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
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center"
            >
              <ImageIcon className="w-8 h-8 text-amber-500" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-2">Limit Harian Tercapai</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Anda telah menggunakan {usageInfo.remaining === 0 ? "15" : "semua"} edit hari ini.
            </p>
            <p className="text-foreground-muted text-sm mb-4">
              Reset setiap pagi pukul 00:00 WIB
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl btn-gradient-purple"
            >
              Upgrade untuk Unlimited
            </button>
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
            {usageInfo.unlimited ? (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                UNLIMITED
              </span>
            ) : (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                {usageInfo.remaining}/15 tersisa hari ini
              </span>
            )}
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
          {!imagePreview ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-colors"
            >
              <Upload className="w-8 h-8 text-foreground-muted" />
              <span className="text-foreground-muted">Klik untuk upload gambar</span>
              <span className="text-xs text-muted-foreground">Gambar akan dikirim langsung ke API</span>
            </motion.button>
          ) : (
            <div className="space-y-4">
              {/* Images Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original Image */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm text-foreground-muted">Original</label>
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={imagePreview}
                      alt="Original"
                      className="w-full h-48 object-contain bg-black/20"
                    />
                    <button
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </motion.div>

                {/* Result Image */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
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
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleReset}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                            title="Reset ke original"
                          >
                            <RotateCcw className="w-4 h-4 text-foreground" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleDownload}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-foreground" />
                          </motion.button>
                        </div>
                      </>
                    ) : (
                      <span className="text-foreground-muted text-sm">
                        {isEditing ? "Processing..." : "Result akan muncul di sini"}
                      </span>
                    )}
                    {isEditing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center"
                      >
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Edit History */}
              {editHistory.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm text-foreground-muted">Edit History</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {editHistory.map((edit, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setResultUrl(edit.resultUrl)}
                        className="shrink-0 p-2 rounded-lg border border-border hover:border-purple-500 transition-colors"
                        title={edit.prompt}
                      >
                        <img
                          src={edit.resultUrl}
                          alt={`Edit ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Prompt Input */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <label className="text-sm text-foreground-muted">
                  Prompt (deskripsikan perubahan yang diinginkan)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    placeholder="Contoh: Ubah temboknya jadi warna hijau..."
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.button>
                </div>
              </motion.div>

              <p className="text-xs text-foreground-muted">
                💡 Tip: Upload gambar baru untuk memulai sesi edit yang berbeda.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LatentLeafModal;
