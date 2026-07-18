import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2 } from "lucide-react";
import { VoiceOption, VOICE_OPTIONS, VOICE_OPTIONS_MAP, getVoiceInfo } from "@/lib/api";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
}

const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/10 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-popover border border-border rounded-2xl shadow-elevated z-50 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-foreground" />
                <h3 className="font-medium text-foreground">AI Voice</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-foreground-muted" />
              </button>
            </div>

            <div className={VOICE_OPTIONS.length > 1 ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
              {VOICE_OPTIONS.map((voice) => {
                const info = getVoiceInfo(voice);
                return (
                  <button
                    key={voice}
                    onClick={() => {
                      onSelectVoice(voice);
                      onClose();
                    }}
                    className={`px-3 py-2.5 rounded-xl text-left transition-all ${
                      selectedVoice === voice
                        ? "bg-foreground text-background"
                        : "bg-accent text-foreground hover:bg-accent/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{info.displayName}</span>
                      <span className={`text-[10px] ${info.gender === "male" ? "text-blue-400" : "text-pink-400"}`}>
                        {info.gender === "male" ? "♂" : "♀"}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${selectedVoice === voice ? "text-background/70" : "text-foreground-muted"}`}>{info.description}</p>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-foreground-muted mt-3 leading-relaxed">
              Fitur suara masih dalam tahap pengembangan, jadi baru ada 1 pilihan suara (Eva) untuk saat ini. Pilihan suara lainnya akan segera menyusul ✨
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceSettingsModal;
