import React, { useState, useRef } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { textToSpeech, VoiceOption } from "@/lib/api";
import { parsePcmDataUrl, playPcmWithAudioContext, pcmToWavUrl } from "@/lib/audioUtils";

interface TTSButtonProps {
  text: string;
  voice: VoiceOption;
  className?: string;
}

const TTSButton: React.FC<TTSButtonProps> = ({ text, voice, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAll = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  const handleSpeak = async () => {
    if (isPlaying) {
      stopAll();
      return;
    }

    setIsLoading(true);

    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .slice(0, 800);

    try {
      const result = await textToSpeech(cleanText, voice);

      if (result.success && result.audioUrl) {
        if (result.audioUrl === "__browser_tts__") {
          setIsPlaying(true);
          setIsLoading(false);
          const checkInterval = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              setIsPlaying(false);
              clearInterval(checkInterval);
            }
          }, 200);
          return;
        }

        const { isPcm, mimeType, base64 } = parsePcmDataUrl(result.audioUrl);

        if (isPcm) {
          setIsPlaying(true);
          setIsLoading(false);

          // Try AudioContext first
          const { played, audioContext, source } = await playPcmWithAudioContext(base64, mimeType);
          if (played && audioContext && source) {
            audioCtxRef.current = audioContext;
            sourceRef.current = source;
            source.onended = () => {
              setIsPlaying(false);
              audioCtxRef.current = null;
              sourceRef.current = null;
            };
            return;
          }

          // Fallback: WAV blob
          const wavUrl = pcmToWavUrl(base64, mimeType);
          if (wavUrl) {
            const audio = new Audio(wavUrl);
            audioRef.current = audio;
            audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(wavUrl); };
            audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(wavUrl); };
            await audio.play();
            return;
          }

          // Final fallback: browser TTS
          window.speechSynthesis?.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.onend = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
        } else {
          // Standard audio URL (mp3, wav, etc.)
          const newAudio = new Audio(result.audioUrl);
          audioRef.current = newAudio;
          newAudio.onended = () => setIsPlaying(false);
          newAudio.onerror = () => { setIsPlaying(false); setIsLoading(false); };
          await newAudio.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSpeak}
      disabled={isLoading}
      className={`p-1.5 rounded-md transition-colors ${
        isPlaying
          ? "text-foreground bg-accent"
          : "text-foreground-muted hover:text-foreground hover:bg-accent/50"
      } disabled:opacity-50 ${className}`}
      title={isPlaying ? "Stop speaking" : "Speak this message"}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export default TTSButton;
