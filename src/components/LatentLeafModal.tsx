import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, Download, RotateCcw, Leaf } from "lucide-react";
import { editImageLatentLeaf, fileToBase64 } from "@/lib/api";
import { getSubscription, canUseLatentLeaf, incrementLatentLeafUsage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LatentLeafModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LatentLeafModal: React.FC<LatentLeafModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<{ prompt: string; resultUrl: string }[]>([]);
  const [usageInfo, setUsageInfo] = useState(canUseLatentLeaf());
  
  const subscription = getSubscription();

  useEffect(() => {
    if (isOpen) setUsageInfo(canUseLatentLeaf());
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    const base64 = await fileToBase64(file);
    setImageBase64(base64);
    setImagePreview(URL.createObjectURL(file));
    setEditHistory([]);
    setResultUrl(null);
    toast({ title: "Gambar siap", description: "Tulis prompt untuk mengedit gambar" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = async () => {
    if (!imageBase64 || !prompt.trim()) {
      toast({ title: "Error", description: "Masukkan gambar dan prompt", variant: "destructive" });
      return;
    }

    const currentUsage = canUseLatentLeaf();
    if (!currentUsage.allowed) {
      toast({ title: "Limit Tercapai", description: "Limit harian tercapai. Reset besok pagi.", variant: "destructive" });
      return;
    }

    setIsEditing(true);
    const sourceImage = resultUrl || imageBase64;
    const result = await editImageLatentLeaf(prompt.trim(), sourceImage);
    setIsEditing(false);

    if (result.success && result.editedImageUrl) {
      if (subscription.plan === "junior") {
        incrementLatentLeafUsage();
        setUsageInfo(canUseLatentLeaf());
      }
      setResultUrl(result.editedImageUrl);
      setEditHistory(prev => [...prev, { prompt, resultUrl: result.editedImageUrl! }]);
      setPrompt("");
      toast({ title: "Berhasil!", description: "Gambar telah diedit" });
    } else {
      toast({ title: "Edit gagal", description: result.error, variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement("a");
      link.href = resultUrl;
      link.download = `latentleaf-${Date.now()}.png`;
      link.click();
    }
  };

  const handleClearImage = () => {
    setImageBase64("");
    setImagePreview("");
    setResultUrl(null);
    setEditHistory([]);
  };

  if (!usageInfo.allowed && !usageInfo.unlimited) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              LatentLeaf Image Edit
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-3xl">🍃</span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Limit Harian Tercapai</h3>
            <p className="text-muted-foreground text-sm mb-4">Reset setiap pagi pukul 00:00 WIB</p>
            <button onClick={onClose} className="px-6 py-2 rounded-xl btn-gradient-purple">OK</button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-background border-border p-4 sm:p-6" style={{ maxWidth: 'calc(100vw - 24px)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            LatentLeaf Image Edit
            {usageInfo.unlimited ? (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">UNLIMITED</span>
            ) : (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{usageInfo.remaining}/15 tersisa</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

        <div className="space-y-6 py-4">
          {!imagePreview ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:bg-green-500/5 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-muted-foreground">Klik untuk upload gambar</span>
            </motion.button>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Original</label>
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={imagePreview} alt="Original" className="w-full h-48 object-contain bg-black/20" />
                    <button onClick={handleClearImage} className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Result</label>
                  <div className="relative rounded-xl overflow-hidden border border-border h-48 flex items-center justify-center bg-black/10">
                    {resultUrl ? (
                      <>
                        <img src={resultUrl} alt="Edited" className="w-full h-full object-contain" />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button onClick={() => setResultUrl(null)} className="p-1.5 rounded-lg bg-background/80"><RotateCcw className="w-4 h-4" /></button>
                          <button onClick={handleDownload} className="p-1.5 rounded-lg bg-background/80"><Download className="w-4 h-4" /></button>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">{isEditing ? "Processing..." : "Result akan muncul di sini"}</span>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {editHistory.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Edit History</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {editHistory.map((edit, i) => (
                      <button key={i} onClick={() => setResultUrl(edit.resultUrl)} className="shrink-0 p-2 rounded-lg border border-border hover:border-green-500" title={edit.prompt}>
                        <img src={edit.resultUrl} alt={`Edit ${i + 1}`} className="w-16 h-16 object-cover rounded" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEdit()} placeholder="Contoh: Ubah background jadi sunset..." className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-green-500" />
                <button onClick={handleEdit} disabled={isEditing || !prompt.trim()} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-2">
                  {isEditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Leaf className="w-5 h-5" />}
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LatentLeafModal;
