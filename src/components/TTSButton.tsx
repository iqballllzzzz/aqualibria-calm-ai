import React, { useState, useRef } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { textToSpeech, VoiceOption } from "@/lib/api";

interface TTSButtonProps {
  text: string;
  voice: VoiceOption;
  className?: string;
}

// Convert base64 PCM L16 to playable WAV
const playPcmAudio = async (base64Data: string, mimeType: string): Promise<HTMLAudioElement | null> => {
  try {
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

    // Determine endianness from mime type
    // Gemini TTS with codec=pcm is typically little-endian already
    const isBigEndian = mimeType.includes("L16") && !mimeType.includes("codec=pcm");
    
    const numSamples = Math.floor(bytes.length / 2);
    const pcmData = new Int16Array(numSamples);
    
    if (isBigEndian) {
      // Big-endian: swap bytes
      for (let i = 0; i < numSamples; i++) {
        pcmData[i] = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
      }
    } else {
      // Little-endian: direct copy (WAV native format)
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < numSamples; i++) {
        pcmData[i] = dataView.getInt16(i * 2, true);
      }
    }

    // Build WAV header
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM samples as little-endian
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    return audio;
  } catch (e) {
    console.error("PCM to WAV conversion failed:", e);
    return null;
  }
};

// Try using AudioContext for more reliable playback
const playWithAudioContext = async (base64Data: string, mimeType: string): Promise<boolean> => {
  try {
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
    
    const numSamples = Math.floor(bytes.length / 2);
    const audioCtx = new AudioContext({ sampleRate });
    const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Determine endianness
    const isBigEndian = mimeType.includes("L16") && !mimeType.includes("codec=pcm");
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    
    for (let i = 0; i < numSamples; i++) {
      const sample = isBigEndian 
        ? dataView.getInt16(i * 2, false) 
        : dataView.getInt16(i * 2, true);
      channelData[i] = sample / 32768.0; // normalize to [-1, 1]
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => {
        audioCtx.close();
        resolve(true);
      };
      source.start(0);
    });
  } catch (e) {
    console.error("AudioContext playback failed:", e);
    return false;
  }
};

const TTSButton: React.FC<TTSButtonProps> = ({ text, voice, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

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

        const isPcm = result.audioUrl.startsWith("data:audio/L16") || result.audioUrl.startsWith("data:audio/pcm");
        
        if (isPcm) {
          const commaIdx = result.audioUrl.indexOf(",");
          const meta = result.audioUrl.substring(5, commaIdx);
          const mimeType = meta.split(";base64")[0];
          const b64 = result.audioUrl.substring(commaIdx + 1);
          
          setIsPlaying(true);
          setIsLoading(false);
          
          // Try AudioContext first (more reliable), then WAV fallback
          const played = await playWithAudioContext(b64, mimeType);
          if (!played) {
            const audio = await playPcmAudio(b64, mimeType);
            if (audio) {
              audioRef.current = audio;
              audio.onended = () => setIsPlaying(false);
              audio.onerror = () => setIsPlaying(false);
              await audio.play();
              return;
            }
            // Final fallback: browser TTS
            window.speechSynthesis?.cancel();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.onend = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
            return;
          }
          setIsPlaying(false);
        } else {
          // Standard audio URL
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
