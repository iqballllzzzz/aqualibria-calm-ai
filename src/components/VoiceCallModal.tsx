import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, ChevronDown, Phone, PhoneOff } from "lucide-react";
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

const SILENCE_TIMEOUT_MS = 4000; // Auto-send after 4s of silence (updated from 2.5s)

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
  const [audioData, setAudioData] = useState<number[]>(new Array(7).fill(0));
  const [callDuration, setCallDuration] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Call duration timer
  useEffect(() => {
    if (isOpen) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isOpen]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        
        // Start silence detection timer - auto-send after 4s silence
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

  // Real-time audio analysis for reactive sound waves
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) {
      // Idle animation when not speaking
      if (callState !== "speaking") {
        setAudioData(prev => prev.map(() => Math.random() * 0.1));
      }
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Get frequency bands for the sound wave bars (7 bars)
    const bands = 7;
    const bandSize = Math.floor(dataArray.length / bands);
    const newData = [];

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[i * bandSize + j];
      }
      // Normalize to 0-1 range with some amplification
      const normalized = (sum / (bandSize * 255)) * 1.5;
      newData.push(Math.min(1, normalized));
    }

    setAudioData(newData);
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [callState]);

  // Start/stop audio analysis
  useEffect(() => {
    if (isOpen) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, analyzeAudio]);

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
        // Handle browser TTS fallback
        if (result.audioUrl === "__browser_tts__") {
          // Browser TTS is already playing via speechSynthesis
          const checkInterval = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              setCallState("idle");
              analyserRef.current = null;
              clearInterval(checkInterval);
              setTimeout(() => {
                if (isOpen) startListening();
              }, 500);
            }
          }, 200);
          return;
        }

        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;

        // Set up audio context for visualization
        try {
          if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            audioContextRef.current = new AudioContext();
          }
          const source = audioContextRef.current.createMediaElementSource(audio);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyser.connect(audioContextRef.current.destination);
          analyserRef.current = analyser;
        } catch (e) {
          console.warn("Audio analysis not supported:", e);
        }

        audio.onended = () => {
          setCallState("idle");
          analyserRef.current = null;
          // Auto-start listening again for continuous conversation
          setTimeout(() => {
            if (isOpen) startListening();
          }, 500);
        };

        audio.onerror = () => {
          setError("Failed to play audio");
          setCallState("idle");
          analyserRef.current = null;
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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
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
    analyserRef.current = null;
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
      analyserRef.current = null;
      setCallState("idle");
      startListening();
    }
  };

  // Enhanced reactive sound wave animation
  const renderSoundWave = () => {
    const barCount = 7;
    
    return (
      <div className="flex items-center justify-center gap-1 h-40">
        {Array.from({ length: barCount }).map((_, index) => {
          // Calculate height based on audio data and call state
          let baseHeight = 16;
          let maxHeight = 120;
          let currentHeight = baseHeight;
          
          if (callState === "speaking") {
            // Reactive to actual audio with smooth interpolation
            currentHeight = baseHeight + (audioData[index] || 0) * (maxHeight - baseHeight);
          } else if (callState === "processing") {
            // Pulsing animation while processing
            currentHeight = baseHeight + Math.sin(Date.now() / 200 + index * 0.5) * 40 + 40;
          } else if (callState === "listening") {
            // Subtle breathing animation while listening
            currentHeight = baseHeight + Math.sin(Date.now() / 500 + index * 0.3) * 15 + 10;
          }
          
          // Center bar is tallest
          const centerIndex = Math.floor(barCount / 2);
          const distanceFromCenter = Math.abs(index - centerIndex);
          const centerMultiplier = 1 - (distanceFromCenter * 0.1);
          currentHeight *= centerMultiplier;
          
          return (
            <motion.div
              key={index}
              className={`w-2 rounded-full transition-colors duration-300 ${
                callState === "speaking" 
                  ? "bg-gradient-to-t from-purple-600 to-purple-400" 
                  : callState === "listening"
                  ? "bg-gradient-to-t from-blue-600 to-blue-400"
                  : callState === "processing"
                  ? "bg-gradient-to-t from-amber-600 to-amber-400"
                  : "bg-muted-foreground/30"
              }`}
              animate={{
                height: currentHeight,
              }}
              transition={{
                duration: callState === "speaking" ? 0.05 : 0.2,
                ease: "linear",
              }}
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
        return "Tap microphone to speak";
    }
  };

  const getStatusColor = () => {
    switch (callState) {
      case "listening":
        return "text-blue-500";
      case "processing":
        return "text-amber-500";
      case "speaking":
        return "text-purple-500";
      default:
        return "text-muted-foreground";
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
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute inset-0 opacity-30"
              animate={{
                background: [
                  "radial-gradient(circle at 30% 80%, hsl(var(--primary)) 0%, transparent 50%)",
                  "radial-gradient(circle at 70% 80%, hsl(var(--primary)) 0%, transparent 50%)",
                  "radial-gradient(circle at 50% 70%, hsl(var(--primary)) 0%, transparent 50%)",
                  "radial-gradient(circle at 30% 80%, hsl(var(--primary)) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[50%] rounded-t-[100%] blur-3xl"
              animate={{
                background: callState === "speaking" 
                  ? ["hsla(var(--primary), 0.2)", "hsla(var(--primary), 0.4)", "hsla(var(--primary), 0.2)"]
                  : callState === "listening"
                  ? ["hsla(217, 91%, 60%, 0.2)", "hsla(217, 91%, 60%, 0.3)", "hsla(217, 91%, 60%, 0.2)"]
                  : "hsla(var(--muted), 0.2)",
                scale: callState === "speaking" ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Header */}
          <header className="relative z-10 flex items-center justify-between p-4 safe-area-inset-top">
            {/* End Call Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="p-3 rounded-full bg-destructive/20 hover:bg-destructive/30 transition-colors"
            >
              <PhoneOff className="w-6 h-6 text-destructive" />
            </motion.button>
            
            {/* Call Duration */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-foreground">AquaLibriaAI</span>
              <span className="text-xs text-muted-foreground">{formatDuration(callDuration)}</span>
            </div>
            
            {/* Voice Selector */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/50 hover:bg-accent transition-colors"
              >
                <Volume2 className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm text-foreground hidden sm:inline">{getVoiceDisplayName(selectedVoice)}</span>
                <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${showVoiceSelector ? "rotate-180" : ""}`} />
              </motion.button>
              
              <AnimatePresence>
                {showVoiceSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
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
          </header>

          {/* Main Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {/* Sound Wave Visualization */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="my-8"
            >
              {renderSoundWave()}
            </motion.div>

            {/* Status Indicator */}
            <motion.div
              key={callState}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                {callState === "listening" && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-current"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                <span className="text-sm font-medium uppercase tracking-wider">
                  {callState === "idle" ? "Ready" : callState}
                </span>
              </div>
              <p className="text-foreground-muted text-center max-w-sm text-sm leading-relaxed min-h-[3rem] break-words-safe">
                {getStatusText()}
              </p>
            </motion.div>

            {/* Error Display */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-sm mt-4 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Conversation History */}
            {conversation.length > 0 && (
              <motion.div 
                ref={conversationRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mt-6 max-h-32 overflow-y-auto space-y-2 px-4 custom-scrollbar"
              >
                {conversation.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-sm p-2.5 rounded-xl ${
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground ml-8 rounded-br-sm"
                        : "bg-accent/50 text-foreground mr-8 rounded-bl-sm"
                    }`}
                  >
                    <p className="break-words-safe">{msg.content.slice(0, 100)}{msg.content.length > 100 ? "..." : ""}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="relative z-10 pb-12 safe-area-inset-bottom flex justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleMicToggle}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                callState === "listening"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                  : callState === "speaking" || callState === "processing"
                  ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/30"
                  : "bg-gradient-to-br from-foreground to-foreground/90 text-background"
              }`}
            >
              {/* Pulse ring animation */}
              {callState === "listening" && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-blue-400"
                  animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {callState === "listening" ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceCallModal;
