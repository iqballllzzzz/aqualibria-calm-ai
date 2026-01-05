import React, { useState } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { textToSpeech, VoiceOption } from "@/lib/api";

interface TTSButtonProps {
  text: string;
  voice: VoiceOption;
  className?: string;
}

const TTSButton: React.FC<TTSButtonProps> = ({ text, voice, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (isPlaying && audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    // Clean markdown for speech
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "code block")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .slice(0, 1000);

    try {
      const result = await textToSpeech(cleanText, voice);

      if (result.success && result.audioUrl) {
        const newAudio = new Audio(result.audioUrl);
        setAudio(newAudio);

        newAudio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(result.audioUrl!);
        };

        newAudio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
        };

        await newAudio.play();
        setIsPlaying(true);
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
