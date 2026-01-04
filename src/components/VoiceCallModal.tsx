import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, ChevronDown } from "lucide-react";
import { VoiceOption, VOICE_OPTIONS, textToSpeech, sendChatMessage } from "@/lib/api";
import { extractMemoryFromMessage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  sessionId: string;
}

type CallState = "idle" | "listening" | "processing" | "speaking";

const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  sessionId,
}) => {
  const { t } = useLanguage();
  const [callState, setCallState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition with multilingual support
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Empty string enables automatic language detection for multilingual support
    recognition.lang = "";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript;
          break;
        } else {
          interimTranscript = result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setError(`Recognition error: ${event.error}`);
      }
      setCallState("idle");
    };

    recognition.onend = () => {
      // If we were listening and have a transcript, process it
      if (callState === "listening" && transcript.trim()) {
        processUserInput(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isOpen]);

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen && callState === "idle") {
      startListening();
    }
  }, [isOpen]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setTranscript("");
    setAiResponse("");
    
    try {
      recognitionRef.current.start();
      setCallState("listening");
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Failed to start voice recognition");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && callState === "listening") {
      recognitionRef.current.stop();
    }
  }, [callState]);

  const processUserInput = async (input: string) => {
    if (!input.trim()) {
      setCallState("idle");
      return;
    }

    setCallState("processing");
    extractMemoryFromMessage(input);

    try {
      const result = await sendChatMessage(input, sessionId);
      
      if (result.success && result.response) {
        setAiResponse(result.response);
        await speakResponse(result.response);
      } else {
        setError(result.error || "Failed to get AI response");
        setCallState("idle");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process");
      setCallState("idle");
    }
  };

  const speakResponse = async (text: string) => {
    setCallState("speaking");

    // Clean markdown for speech
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "code block")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .slice(0, 800);

    try {
      const result = await textToSpeech(cleanText, selectedVoice);

      if (result.success && result.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setCallState("idle");
          // Auto-start listening again for continuous conversation
          setTimeout(() => {
            if (isOpen) startListening();
          }, 500);
        };

        audio.onerror = () => {
          setError("Failed to play audio");
          setCallState("idle");
        };

        await audio.play();
      } else {
        throw new Error(result.error || "Failed to generate speech");
      }
    } catch (err: any) {
      console.error("TTS Error:", err);
      setError(err.message || "Failed to speak");
      setCallState("idle");
    }
  };

  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCallState("idle");
    setTranscript("");
    setAiResponse("");
    setError(null);
    onClose();
  };

  const handleMicToggle = () => {
    if (callState === "listening") {
      stopListening();
      if (transcript.trim()) {
        processUserInput(transcript);
      } else {
        setCallState("idle");
      }
    } else if (callState === "idle") {
      startListening();
    } else if (callState === "speaking") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCallState("idle");
      startListening();
    }
  };

  // Sound wave bars animation
  const renderSoundWave = () => {
    const barCount = 5;
    const isActive = callState === "speaking" || callState === "processing";
    
    return (
      <div className="flex items-center justify-center gap-1 h-32">
        {Array.from({ length: barCount }).map((_, index) => (
          <motion.div
            key={index}
            className="w-2 bg-foreground rounded-full"
            animate={
              isActive
                ? {
                    height: ["24px", "80px", "40px", "72px", "24px"],
                  }
                : { height: "24px" }
            }
            transition={
              isActive
                ? {
                    duration: 0.8,
                    repeat: Infinity,
                    delay: index * 0.1,
                    ease: "easeInOut",
                  }
                : { duration: 0.3 }
            }
          />
        ))}
      </div>
    );
  };

  const getStatusText = () => {
    switch (callState) {
      case "listening":
        return transcript || "Listening...";
      case "processing":
        return "AquaLibriaAI is thinking...";
      case "speaking":
        return aiResponse.slice(0, 100) + (aiResponse.length > 100 ? "..." : "");
      default:
        return "Tap to speak";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background z-50 flex flex-col"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-accent/20 via-accent/10 to-transparent" />
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[40%] rounded-t-[100%] bg-gradient-to-t from-accent/30 to-transparent blur-3xl"
              animate={{
                scale: callState === "speaking" || callState === "processing" ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Header */}
          <header className="relative z-10 flex items-center justify-between p-4">
            <button
              onClick={handleClose}
              className="p-3 rounded-full bg-destructive/20 hover:bg-destructive/30 transition-colors"
            >
              <X className="w-6 h-6 text-destructive" />
            </button>
            
            {/* Voice Selector */}
            <div className="relative">
              <button
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 hover:bg-accent transition-colors"
              >
                <Volume2 className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm capitalize text-foreground">{selectedVoice}</span>
                <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${showVoiceSelector ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {showVoiceSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-40 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden"
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <button
                        key={voice}
                        onClick={() => {
                          onSelectVoice(voice);
                          setShowVoiceSelector(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm capitalize transition-colors ${
                          selectedVoice === voice
                            ? "bg-accent text-foreground"
                            : "text-foreground-muted hover:bg-accent/50"
                        }`}
                      >
                        {voice}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="w-12" /> {/* Spacer for centering */}
          </header>

          {/* Main Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-medium text-foreground mb-2"
            >
              AquaLibriaAI Live
            </motion.h1>

            {/* Sound Wave */}
            <div className="my-8">
              {renderSoundWave()}
            </div>

            {/* Status Text */}
            <motion.p
              key={callState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-foreground-muted text-center max-w-sm text-sm leading-relaxed min-h-[3rem]"
            >
              {getStatusText()}
            </motion.p>

            {/* Error Display */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-sm mt-4"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="relative z-10 pb-12 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMicToggle}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                callState === "listening"
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : callState === "speaking" || callState === "processing"
                  ? "bg-accent text-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {callState === "listening" ? (
                <MicOff className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceCallModal;
