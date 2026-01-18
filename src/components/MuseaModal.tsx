import React from "react";
import { Music, Construction } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MuseaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MuseaModal: React.FC<MuseaModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            Musea - AI Music Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Construction className="w-10 h-10 text-purple-500" />
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-3">
            Segera Hadir! 🎵
          </h3>
          
          <p className="text-foreground-muted text-sm mb-6 max-w-xs mx-auto">
            Musea adalah fitur AI Music Generator yang memungkinkan Anda membuat lagu hanya dengan menulis lirik!
          </p>
          
          <div className="space-y-3 text-left max-w-xs mx-auto">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="text-2xl">✍️</span>
              <div>
                <p className="text-sm font-medium text-foreground">Tulis Lirik</p>
                <p className="text-xs text-foreground-muted">Cukup tulis lirik lagu yang Anda inginkan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="text-2xl">🎸</span>
              <div>
                <p className="text-sm font-medium text-foreground">Pilih Genre</p>
                <p className="text-xs text-foreground-muted">Pop, Rock, Jazz, dan lainnya</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="text-2xl">🎧</span>
              <div>
                <p className="text-sm font-medium text-foreground">Generate & Download</p>
                <p className="text-xs text-foreground-muted">AI akan membuat musik lengkap untuk Anda</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-foreground-muted">
              Dalam tahap pengembangan aktif. Stay tuned! 🚀
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MuseaModal;
