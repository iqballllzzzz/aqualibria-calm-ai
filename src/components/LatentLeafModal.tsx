import React, { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { editImageLatentLeaf } from "@/lib/api";
import { getImageEditSession, updateImageEditSession, canUseLatentLeaf, incrementLatentLeafUsage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface LatentLeafModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LatentLeafModal: React.FC<LatentLeafModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ prompt: string; resultUrl: string }[]>([]);
  const [usageInfo, setUsageInfo] = useState(canUseLatentLeaf());

  useEffect(() => {
    if (isOpen) {
      setUsageInfo(canUseLatentLeaf());
      const sess = getImageEditSession();
      if (sess) {
        setPreview(sess.lastImageUrl || null);
        setHistory(sess.editHistory || []);
      } else setHistory([]);
    }
  }, [isOpen]);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Error", description: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleEdit = async () => {
    if (!file || !prompt.trim()) {
      toast({ title: "Error", description: "Masukkan gambar dan prompt", variant: "destructive" });
      return;
    }
    const u = canUseLatentLeaf();
    if (!u.allowed) {
      toast({ title: "Batas tercapai", description: `Sisa: ${u.remaining}`, variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await editImageLatentLeaf(prompt, file);
    setLoading(false);
    if (res.success && res.editedImageUrl) {
      updateImageEditSession(preview || "", prompt, res.editedImageUrl);
      incrementLatentLeafUsage();
      setUsageInfo(canUseLatentLeaf());
      const sess = getImageEditSession();
      setHistory(sess?.editHistory || []);
      toast({ title: "Sukses", description: "Gambar berhasil diedit" });
    } else {
      toast({ title: "Gagal", description: res.error || "Gagal mengedit gambar", variant: "destructive" });
    }
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setPrompt("");
    setHistory([]);
  };

  if (!isOpen) return null;
  return (
    <div className="latentleaf-modal p-4 max-w-2xl mx-auto bg-card rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">LatentLeaf Image Edit</h3>
        <button onClick={onClose} className="p-2"><X /></button>
      </div>

      <div className="space-y-3">
        <input ref={fileRef} id="latentleaf-file" type="file" accept="image/*" onChange={onSelect} className="hidden" />
        <label htmlFor="latentleaf-file" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent cursor-pointer">
          <Upload /> <span>Pilih Gambar</span>
        </label>

        {preview && <img src={preview} alt="preview" className="mt-2 w-full max-h-64 object-contain rounded-md" />}

        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Instruksi edit, misal: Ubah temboknya jadi warna hijau" className="w-full p-3 rounded border" rows={3} />

        <div className="flex items-center gap-2">
          <button onClick={handleEdit} disabled={loading} className="px-4 py-2 rounded bg-primary text-white">
            {loading ? <Loader2 className="animate-spin" /> : "Edit Gambar"}
          </button>
          <button onClick={clearAll} className="px-3 py-2 rounded border">Clear</button>
          <div className="ml-auto text-sm text-muted">Remaining LatentLeaf: {usageInfo.remaining}</div>
        </div>

        {history.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium">Riwayat Edit</h4>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {history.map((h, i) => (
                <div key={i} className="p-2 border rounded flex items-center gap-2">
                  <img src={h.resultUrl} alt={`edit-${i}`} className="w-20 h-20 object-cover rounded" />
                  <div className="text-sm">{h.prompt}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatentLeafModal;
