import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, ChevronDown, Phone, PhoneOff, Play, ArrowRight } from "lucide-react";
import { VoiceOption, VOICE_OPTIONS, VOICE_OPTIONS_MAP, getVoiceDisplayName, getVoiceInfo, textToSpeech, sendChatMessage, ChatMessage, generateMessageId } from "@/lib/api";
import { extractMemoryFromMessage } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";
import { parsePcmDataUrl, pcmToWavUrl } from "@/lib/audioUtils";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: (messages: ChatMessage[]) => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  sessionId: string;
}

type CallState = "idle" | "listening" | "processing" | "speaking";
type ModalPhase = "voice-picker" | "call";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const SILENCE_TIMEOUT_MS = 4000;

const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  sessionId,
}) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<ModalPhase>("voice-picker");
  const [previewingVoice, setPreviewingVoice] = useState<VoiceOption | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const selectedVoiceRef = useRef<VoiceOption>(selectedVoice);
  const processUserInputRef = useRef<(input: string) => void>(() => {});
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reset phase when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("voice-picker");
      setPreviewingVoice(null);
      setPreviewLoading(false);
    }
  }, [isOpen]);

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

  // Call duration timer
  useEffect(() => {
    if (isOpen && phase === "call") {
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [isOpen, phase]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Preview voice - play TTS sample
  const handlePreviewVoice = async (voice: VoiceOption) => {
    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    
    if (previewingVoice === voice) {
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(voice);
    setPreviewLoading(true);
    
    try {
      const result = await textToSpeech("Halo, saya AqualibriaAI. Ada yang bisa saya bantu?", voice);
      
      if (result.success && result.audioUrl) {
        if (result.audioUrl === "__browser_tts__") {
          setPreviewLoading(false);
          return;
        }

        const { isPcm, mimeType, base64 } = parsePcmDataUrl(result.audioUrl);
        
        if (isPcm) {
          const { playPcmWithAudioContext } = await import("@/lib/audioUtils");
          const playResult = await playPcmWithAudioContext(base64, mimeType);
          if (playResult.played && playResult.source) {
            playResult.source.onended = () => setPreviewingVoice(null);
          }
        } else {
          const audio = new Audio(result.audioUrl);
          previewAudioRef.current = audio;
          audio.onended = () => { setPreviewingVoice(null); previewAudioRef.current = null; };
          await audio.play();
        }
      }
    } catch (err) {
      console.error("Preview voice error:", err);
    }
    setPreviewLoading(false);
  };

  const handleSelectAndContinue = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingVoice(null);
    setPhase("call");
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!isOpen || phase !== "call") return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { setError("Speech recognition not supported"); return; }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) { finalTranscript = result[0].transcript; break; }
        else { interimTranscript = result[0].transcript; }
      }
      const currentTranscript = finalTranscript || interimTranscript;
      if (currentTranscript) {
        setTranscript(currentTranscript);
        lastTranscriptRef.current = currentTranscript;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current.trim() && callStateRef.current === "listening") {
            recognitionRef.current?.stop();
            processUserInputRef.current(lastTranscriptRef.current);
          }
        }, SILENCE_TIMEOUT_MS);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") setError(`Recognition error: ${event.error}`);
      if (event.error === "no-speech" && isOpen) setTimeout(() => startListening(), 500);
    };

    recognition.onend = () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognition.abort();
    };
  }, [isOpen, phase]);

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [conversation]);

  // Auto-start listening when entering call phase
  useEffect(() => {
    if (isOpen && phase === "call" && callState === "idle") {
      setTimeout(() => startListening(), 300);
    }
  }, [isOpen, phase]);

  // Audio analysis
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) {
      if (callState !== "speaking") setAudioData(prev => prev.map(() => Math.random() * 0.1));
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      return;
    }
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const bands = 7;
    const bandSize = Math.floor(dataArray.length / bands);
    const newData = [];
    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) sum += dataArray[i * bandSize + j];
      newData.push(Math.min(1, (sum / (bandSize * 255)) * 1.5));
    }
    setAudioData(newData);
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [callState]);

  useEffect(() => {
    if (isOpen && phase === "call") {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isOpen, phase, analyzeAudio]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null); setTranscript(""); setAiResponse(""); lastTranscriptRef.current = "";
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current.start(); setCallState("listening"); }
    catch (err) { setError("Failed to start voice recognition"); }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && callState === "listening") recognitionRef.current.stop();
  }, [callState]);

  const processUserInput = async (input: string) => {
    if (!input.trim()) { setCallState("idle"); return; }
    const userMsg: ConversationMessage = { role: "user", content: input, id: generateMessageId() };
    setConversation(prev => [...prev, userMsg]);
    setCallState("processing");
    extractMemoryFromMessage(input);
    try {
      const result = await sendChatMessage(input, sessionId);
      if (result.success && result.response) {
        setAiResponse(result.response);
        const aiMsg: ConversationMessage = { role: "assistant", content: result.response, id: generateMessageId() };
        setConversation(prev => [...prev, aiMsg]);
        await speakResponse(result.response);
      } else { setError(result.error || "Failed to get AI response"); setCallState("idle"); }
    } catch (err: any) { setError(err.message || "Failed to process"); setCallState("idle"); }
  };

  processUserInputRef.current = processUserInput;

  const speakResponse = async (text: string) => {
    setCallState("speaking");
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`{1,3}[^`]*`{1,3}/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/#{1,6}\s*/g, "").slice(0, 600);

    try {
      const result = await textToSpeech(cleanText, selectedVoiceRef.current);
      if (result.success && result.audioUrl) {
        if (result.audioUrl === "__browser_tts__") {
          const checkInterval = setInterval(() => {
            if (!window.speechSynthesis.speaking) { setCallState("idle"); analyserRef.current = null; clearInterval(checkInterval); setTimeout(() => { if (isOpen) startListening(); }, 500); }
          }, 200);
          return;
        }
        if (audioRef.current) audioRef.current.pause();
        const { isPcm, mimeType, base64 } = parsePcmDataUrl(result.audioUrl);
        
        if (isPcm) {
          try {
            if (audioContextRef.current && audioContextRef.current.state !== "closed") await audioContextRef.current.close();
            const { playPcmWithAudioContext } = await import("@/lib/audioUtils");
            const playResult = await playPcmWithAudioContext(base64, mimeType);
            if (playResult.played && playResult.audioContext && playResult.source) {
              audioContextRef.current = playResult.audioContext;
              const analyser = playResult.audioContext.createAnalyser();
              analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.8;
              analyserRef.current = analyser;
              playResult.source.onended = () => { setCallState("idle"); analyserRef.current = null; setTimeout(() => { if (isOpen) startListening(); }, 500); };
            } else throw new Error("PCM playback failed");
          } catch (e) {
            const wavUrl = pcmToWavUrl(base64, mimeType);
            if (wavUrl) {
              const audio = new Audio(wavUrl); audioRef.current = audio;
              audio.onended = () => { setCallState("idle"); analyserRef.current = null; URL.revokeObjectURL(wavUrl); setTimeout(() => { if (isOpen) startListening(); }, 500); };
              audio.onerror = () => { setError("Failed to play audio"); setCallState("idle"); URL.revokeObjectURL(wavUrl); };
              await audio.play();
            } else { setError("Failed to convert audio"); setCallState("idle"); }
          }
        } else {
          try {
            if (audioContextRef.current && audioContextRef.current.state !== "closed") await audioContextRef.current.close();
            const audioCtx = new AudioContext(); audioContextRef.current = audioCtx;
            const response = await fetch(result.audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const analyser = audioCtx.createAnalyser(); analyser.fftSize = 128; analyserRef.current = analyser;
            const source = audioCtx.createBufferSource(); source.buffer = audioBuffer;
            source.connect(analyser); analyser.connect(audioCtx.destination);
            source.onended = () => { setCallState("idle"); analyserRef.current = null; setTimeout(() => { if (isOpen) startListening(); }, 500); };
            source.start(0);
          } catch (e) {
            const audio = new Audio(result.audioUrl); audioRef.current = audio;
            audio.onended = () => { setCallState("idle"); analyserRef.current = null; setTimeout(() => { if (isOpen) startListening(); }, 500); };
            audio.onerror = () => { setError("Failed to play audio"); setCallState("idle"); };
            await audio.play();
          }
        }
      } else throw new Error(result.error || "Failed to generate speech");
    } catch (err: any) { console.error("TTS Error:", err); setError(err.message || "Failed to speak"); setCallState("idle"); }
  };

  const handleClose = () => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    if (recognitionRef.current) recognitionRef.current.abort();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
    const chatMessages: ChatMessage[] = conversation.map(msg => ({ role: msg.role, content: msg.content, timestamp: new Date(), id: msg.id, isVoiceChat: true }));
    setCallState("idle"); setTranscript(""); setAiResponse(""); setError(null); setConversation([]); analyserRef.current = null;
    onClose(chatMessages);
  };

  const handleMicToggle = () => {
    if (callState === "listening") { stopListening(); if (transcript.trim()) processUserInput(transcript); else setCallState("idle"); }
    else if (callState === "idle") startListening();
    else if (callState === "speaking") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      analyserRef.current = null; setCallState("idle"); startListening();
    }
  };

  const renderSoundWave = () => {
    const barCount = 7;
    return (
      <div className="flex items-center justify-center gap-1 h-40">
        {Array.from({ length: barCount }).map((_, index) => {
          let baseHeight = 16, maxHeight = 120, currentHeight = baseHeight;
          if (callState === "speaking") currentHeight = baseHeight + (audioData[index] || 0) * (maxHeight - baseHeight);
          else if (callState === "processing") currentHeight = baseHeight + Math.sin(Date.now() / 200 + index * 0.5) * 40 + 40;
          else if (callState === "listening") currentHeight = baseHeight + Math.sin(Date.now() / 500 + index * 0.3) * 15 + 10;
          const centerIndex = Math.floor(barCount / 2);
          const distanceFromCenter = Math.abs(index - centerIndex);
          currentHeight *= 1 - (distanceFromCenter * 0.1);
          return (
            <motion.div key={index}
              className={`w-2 rounded-full transition-colors duration-300 ${callState === "speaking" ? "bg-gradient-to-t from-purple-600 to-purple-400" : callState === "listening" ? "bg-gradient-to-t from-blue-600 to-blue-400" : callState === "processing" ? "bg-gradient-to-t from-amber-600 to-amber-400" : "bg-muted-foreground/30"}`}
              animate={{ height: currentHeight }}
              transition={{ duration: callState === "speaking" ? 0.05 : 0.2, ease: "linear" }}
            />
          );
        })}
      </div>
    );
  };

  const getStatusText = () => {
    switch (callState) {
      case "listening": return transcript || "Listening...";
      case "processing": return "AquaLibriaAI is thinking...";
      case "speaking": return "Speaking...";
      default: return "Tap microphone to speak";
    }
  };

  const getBetaMessage = () => {
    if (callState === "processing" || callState === "speaking") return "Mohon sabar menunggu ai berbicara karena ini merupakan project beta test dan belum memiliki sistem yang baik.";
    return null;
  };

  const getStatusColor = () => {
    switch (callState) {
      case "listening": return "text-blue-500";
      case "processing": return "text-amber-500";
      case "speaking": return "text-purple-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div className="absolute inset-0 opacity-30" animate={{ background: ["radial-gradient(circle at 30% 80%, hsl(var(--primary)) 0%, transparent 50%)", "radial-gradient(circle at 70% 80%, hsl(var(--primary)) 0%, transparent 50%)", "radial-gradient(circle at 50% 70%, hsl(var(--primary)) 0%, transparent 50%)", "radial-gradient(circle at 30% 80%, hsl(var(--primary)) 0%, transparent 50%)"] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          </div>

          {phase === "voice-picker" ? (
            /* ============ VOICE PICKER PHASE ============ */
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
                {/* Close button */}
                <button onClick={handleClose} className="absolute top-6 right-6 p-3 rounded-full bg-accent/50 hover:bg-accent transition-colors">
                  <X className="w-5 h-5 text-foreground-muted" />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Volume2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Pilih Suara AI</h2>
                  <p className="text-foreground-muted text-sm">Dengarkan preview dan pilih suara favoritmu</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-8 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                  {VOICE_OPTIONS.map((voice) => {
                    const info = getVoiceInfo(voice);
                    const isSelected = selectedVoice === voice;
                    const isPreviewing = previewingVoice === voice;
                    return (
                      <motion.button
                        key={voice}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          onSelectVoice(voice);
                          handlePreviewVoice(voice);
                        }}
                        className={`relative px-3 py-3 rounded-2xl text-left transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-card border-border hover:border-primary/30 hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{info.displayName}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] ${info.gender === "male" ? "text-blue-400" : "text-pink-400"}`}>
                              {info.gender === "male" ? "♂" : "♀"}
                            </span>
                            {isPreviewing ? (
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                                <Volume2 className={`w-3.5 h-3.5 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                              </motion.div>
                            ) : (
                              <Play className={`w-3 h-3 ${isSelected ? "text-primary-foreground/70" : "text-foreground-muted"}`} />
                            )}
                          </div>
                        </div>
                        <p className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-foreground-muted"}`}>{info.description}</p>
                      </motion.button>
                    );
                  })}
                </div>

                {previewLoading && (
                  <p className="text-center text-xs text-foreground-muted mb-4 animate-pulse">Memuat preview suara...</p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSelectAndContinue}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  <span>Lanjutkan dengan {getVoiceDisplayName(selectedVoice)}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            </div>
          ) : (
            /* ============ CALL PHASE ============ */
            <>
              {/* Header */}
              <header className="relative z-10 flex items-center justify-between p-4 safe-area-inset-top">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleClose} className="p-3 rounded-full bg-destructive/20 hover:bg-destructive/30 transition-colors">
                  <PhoneOff className="w-6 h-6 text-destructive" />
                </motion.button>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-foreground">AquaLibriaAI</span>
                  <span className="text-xs text-muted-foreground">{formatDuration(callDuration)}</span>
                </div>
                <div className="relative">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowVoiceSelector(!showVoiceSelector)} className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/50 hover:bg-accent transition-colors">
                    <Volume2 className="w-4 h-4 text-foreground-muted" />
                    <span className="text-sm text-foreground hidden sm:inline">{getVoiceDisplayName(selectedVoice)}</span>
                    <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${showVoiceSelector ? "rotate-180" : ""}`} />
                  </motion.button>
                  <AnimatePresence>
                    {showVoiceSelector && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden max-h-80 overflow-y-auto z-50">
                        {VOICE_OPTIONS.map((voice) => {
                          const info = getVoiceInfo(voice);
                          return (
                            <button key={voice} onClick={() => { onSelectVoice(voice); setShowVoiceSelector(false); }}
                              className={`w-full px-4 py-3 text-left transition-colors ${selectedVoice === voice ? "bg-accent text-foreground" : "text-foreground-muted hover:bg-accent/50"}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{info.displayName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${info.gender === "male" ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"}`}>{info.gender === "male" ? "♂" : "♀"}</span>
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
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="my-8">
                  {renderSoundWave()}
                </motion.div>
                <motion.div key={callState} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                  <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                    {callState === "listening" && <motion.div className="w-2 h-2 rounded-full bg-current" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
                    <span className="text-sm font-medium uppercase tracking-wider">{callState === "idle" ? "Ready" : callState}</span>
                  </div>
                  <p className="text-foreground-muted text-center max-w-sm text-sm leading-relaxed min-h-[3rem] break-words-safe">{getStatusText()}</p>
                  {getBetaMessage() && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-500/80 text-center max-w-sm text-xs mt-2 italic">{getBetaMessage()}</motion.p>}
                </motion.div>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mt-4 text-center">{error}</motion.p>}
                {conversation.length > 0 && (
                  <motion.div ref={conversationRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mt-6 max-h-32 overflow-y-auto space-y-2 px-4 custom-scrollbar">
                    {conversation.map((msg) => (
                      <motion.div key={msg.id} initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}
                        className={`text-sm p-2.5 rounded-xl ${msg.role === "user" ? "bg-primary/10 text-foreground ml-8 rounded-br-sm" : "bg-accent/50 text-foreground mr-8 rounded-bl-sm"}`}>
                        <p className="break-words-safe">{msg.content.slice(0, 100)}{msg.content.length > 100 ? "..." : ""}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="relative z-10 pb-12 safe-area-inset-bottom flex justify-center">
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleMicToggle}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    callState === "listening" ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                    : callState === "speaking" || callState === "processing" ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/30"
                    : "bg-gradient-to-br from-foreground to-foreground/90 text-background"
                  }`}>
                  {callState === "listening" && <motion.div className="absolute inset-0 rounded-full border-2 border-blue-400" animate={{ scale: [1, 1.3], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />}
                  {callState === "listening" ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceCallModal;
