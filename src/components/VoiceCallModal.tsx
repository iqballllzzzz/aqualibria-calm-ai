import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, ChevronDown, User, Bot } from "lucide-react";
import { VoiceOption, VOICE_OPTIONS, VOICE_OPTIONS_MAP, getVoiceDisplayName, getVoiceInfo, textToSpeech, sendChatMessage, ChatMessage, generateMessageId } from "@/lib/api";
import { extractMemoryFromMessage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: (messages: ChatMessage[]) => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  sessionId: string;
}

type CallState = "idle" | "listening" | "processing" | "speaking";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const SILENCE_TIMEOUT_MS = 2500; // Auto-send after 2.5s of silence

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
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0));
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");

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

    recognition.onresult = (event: any) => {
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

      const currentTranscript = finalTranscript || interimTranscript;
      if (currentTranscript) {
        setTranscript(currentTranscript);
        lastTranscriptRef.current = currentTranscript;
        
        // Reset silence timer on new speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Start silence detection timer - auto-send after silence
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current.trim() && callState === "listening") {
            recognitionRef.current?.stop();
            processUserInput(lastTranscriptRef.current);
          }
        }, SILENCE_TIMEOUT_MS);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Recognition error: ${event.error}`);
      }
      // On no-speech, restart listening
      if (event.error === "no-speech" && isOpen) {
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onend = () => {
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      recognition.abort();
    };
  }, [isOpen]);

  // Scroll conversation to bottom
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen && callState === "idle") {
      startListening();
    }
  }, [isOpen]);

  // Analyze audio for sound wave animation
  const analyzeAudio = useCallback(() => {
    if (!audioAnalyser) return;

    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteFrequencyData(dataArray);

    // Get 5 frequency bands for the sound wave bars
    const bands = 5;
    const bandSize = Math.floor(dataArray.length / bands);
    const newData = [];

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[i * bandSize + j];
      }
      // Normalize to 0-1 range
      newData.push(sum / (bandSize * 255));
    }

    setAudioData(newData);
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [audioAnalyser]);

  // Start audio analysis when speaking
  useEffect(() => {
    if (callState === "speaking" && audioAnalyser) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioData(new Array(5).fill(0));
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [callState, audioAnalyser, analyzeAudio]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setTranscript("");
    setAiResponse("");
    lastTranscriptRef.current = "";
    
    // Clear any existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    try {
      recognitionRef.current.start();
      setCallState("listening");
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Failed to start voice recognition");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current && callState === "listening") {
      recognitionRef.current.stop();
    }
  }, [callState]);

  const processUserInput = async (input: string) => {
    if (!input.trim()) {
      setCallState("idle");
      return;
    }

    // Add user message to conversation
    const userMsg: ConversationMessage = {
      role: "user",
      content: input,
      id: generateMessageId(),
    };
    setConversation(prev => [...prev, userMsg]);

    setCallState("processing");
    extractMemoryFromMessage(input);

    try {
      const result = await sendChatMessage(input, sessionId);
      
      if (result.success && result.response) {
        setAiResponse(result.response);
        
        // Add AI message to conversation
        const aiMsg: ConversationMessage = {
          role: "assistant",
          content: result.response,
          id: generateMessageId(),
        };
        setConversation(prev => [...prev, aiMsg]);
        
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
      .slice(0, 1000);

    try {
      const result = await textToSpeech(cleanText, selectedVoice);

      if (result.success && result.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;

        // Set up audio context for visualization
        try {
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          const source = audioContext.createMediaElementSource(audio);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          setAudioAnalyser(analyser);
        } catch (e) {
          console.warn("Audio analysis not supported:", e);
        }

        audio.onended = () => {
          setCallState("idle");
          setAudioAnalyser(null);
          if (result.audioUrl) {
            URL.revokeObjectURL(result.audioUrl);
          }
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
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // Convert conversation to ChatMessage format for saving
    const chatMessages: ChatMessage[] = conversation.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(),
      id: msg.id,
      isVoiceChat: true,
    }));
    
    setCallState("idle");
    setTranscript("");
    setAiResponse("");
    setError(null);
    setConversation([]);
    setAudioAnalyser(null);
    onClose(chatMessages);
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

  // Sound wave bars animation - reactive to audio
  const renderSoundWave = () => {
    const barCount = 5;
    const isActive = callState === "speaking" || callState === "processing";
    
    return (
      <div className="flex items-center justify-center gap-1.5 h-32">
        {Array.from({ length: barCount }).map((_, index) => {
          const height = isActive 
            ? 24 + (audioData[index] || 0) * 80
            : 24;
          
          return (
            <motion.div
              key={index}
              className="w-2 bg-foreground rounded-full"
              animate={{
                height: callState === "processing" 
                  ? [24, 60, 40, 72, 24]
                  : height,
              }}
              transition={
                callState === "processing"
                  ? {
                      duration: 0.8,
                      repeat: Infinity,
                      delay: index * 0.1,
                      ease: "easeInOut",
                    }
                  : { duration: 0.1, ease: "linear" }
              }
            />
          );
        })}
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
        return "Speaking...";
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
                opacity: callState === "speaking" ? [0.3, 0.5, 0.3] : 0.3,
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
                <span className="text-sm text-foreground">{getVoiceDisplayName(selectedVoice)}</span>
                <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${showVoiceSelector ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {showVoiceSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden max-h-80 overflow-y-auto"
                  >
                    {VOICE_OPTIONS.map((voice) => {
                      const info = getVoiceInfo(voice);
                      return (
                        <button
                          key={voice}
                          onClick={() => {
                            onSelectVoice(voice);
                            setShowVoiceSelector(false);
                          }}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            selectedVoice === voice
                              ? "bg-accent text-foreground"
                              : "text-foreground-muted hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{info.displayName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              info.gender === "male" 
                                ? "bg-blue-500/20 text-blue-400" 
                                : "bg-pink-500/20 text-pink-400"
                            }`}>
                              {info.gender === "male" ? "♂" : "♀"}
                            </span>
                          </div>
                          <p className="text-xs text-foreground-muted mt-0.5">{info.description}</p>
                        </button>
                      );
                    })}
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

            {/* Conversation History */}
            {conversation.length > 0 && (
              <div 
                ref={conversationRef}
                className="w-full max-w-md mt-6 max-h-40 overflow-y-auto space-y-2 px-4"
              >
                {conversation.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm p-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-foreground/5 text-foreground-muted ml-8"
                        : "bg-accent/30 text-foreground mr-8"
                    }`}
                  >
                    {msg.content.slice(0, 100)}{msg.content.length > 100 ? "..." : ""}
                  </motion.div>
                ))}
              </div>
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
