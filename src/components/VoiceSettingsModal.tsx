import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2 } from "lucide-react";
import { VoiceOption, VOICE_OPTIONS } from "@/lib/api";

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

            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice}
                  onClick={() => {
                    onSelectVoice(voice);
                    onClose();
                  }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                    selectedVoice === voice
                      ? "bg-foreground text-background"
                      : "bg-accent text-foreground hover:bg-accent/80"
                  }`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceSettingsModal;
