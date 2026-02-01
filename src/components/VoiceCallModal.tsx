import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, MicOff } from "lucide-react";
import { sendChatMessage, textToSpeech, VOICE_OPTIONS } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: (messages?: any[]) => void;
  selectedVoice: string;
  onSelectVoice: (v: string) => void;
  sessionId: string;
}

const AUTO_REPLY_MS = 4000;

const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ isOpen, onClose, selectedVoice, onSelectVoice, sessionId }) => {
  const { t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [callState, setCallState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [audioLevels, setAudioLevels] = useState({ rms: 0, centroid: 0 });
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const startAutoReplyTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(async () => {
      setCallState("processing");
      const autoPrompt = "Masih ingin melanjutkan? Saya siap membantu.";
      const res = await sendChatMessage(autoPrompt, sessionId);
      if (res.success && res.response) await speakText(res.response, selectedVoice);
      setCallState("idle");
    }, AUTO_REPLY_MS);
  };
  const clearAutoReplyTimer = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  };

  const playAudioUrl = useCallback(async (audioUrl: string) => {
    try {
      if (!audioUrl) return;
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const resp = await fetch(audioUrl);
      const ab = await resp.arrayBuffer();
      const buffer = await ctx.decodeAudioData(ab);
      if (srcRef.current) {
        try { srcRef.current.stop(); } catch {}
        srcRef.current.disconnect();
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      src.start(0);
      analyserRef.current = analyser;
      srcRef.current = src;

      const time = new Uint8Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(time);
        analyserRef.current.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < time.length; i++) {
          const v = (time[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / time.length);
        let num = 0, den = 0;
        for (let i = 0; i < freq.length; i++) {
          const m = freq[i];
          num += i * m;
          den += m;
        }
        const centroid = den > 0 ? (num / den) / freq.length : 0;
        setAudioLevels({ rms, centroid });
        raf = requestAnimationFrame(loop);
      };
      loop();
      src.onended = () => { cancelAnimationFrame(raf); setAudioLevels({ rms: 0, centroid: 0 }); };
    } catch (e) {
      console.error("playAudioUrl error", e);
    }
  }, []);

  const speakText = useCallback(async (text: string, voice: string) => {
    setCallState("speaking");
    const res = await textToSpeech(text as any, voice as any);
    if (res.success && res.audioUrl) {
      await playAudioUrl(res.audioUrl);
    } else console.error("TTS failed", res.error);
    setCallState("idle");
  }, [playAudioUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "";
    rec.onresult = async (ev: any) => {
      clearAutoReplyTimer();
      startAutoReplyTimer();
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        setTranscript(final);
        setCallState("processing");
        const ai = await sendChatMessage(final, sessionId);
        if (ai.success && ai.response) {
          await speakText(ai.response, selectedVoice);
        }
        setCallState("idle");
      } else setTranscript(interim);
    };
    rec.onerror = (e: any) => console.error("rec error", e);
    rec.onend = () => { try { rec.start(); } catch {} };
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
    startAutoReplyTimer();

    return () => {
      clearAutoReplyTimer();
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [isOpen, selectedVoice, sessionId, speakText]);

  const renderWave = () => {
    const bars = 20;
    const amplitude = Math.min(1, audioLevels.rms * 6);
    const tone = audioLevels.centroid;
    const items = [];
    for (let i = 0; i < bars; i++) {
      const variance = Math.sin((i / bars) * Math.PI * 2 + tone * Math.PI * 2) * 0.5 + 0.5;
      const height = Math.max(4, amplitude * 120 * variance);
      const hue = 220 - tone * 120;
      const color = `hsl(${hue}, 80%, ${35 + amplitude * 30}%)`;
      items.push(<div key={i} style={{ width: 6, height, background: color, borderRadius: 4 }} />);
    }
    return <div className="flex gap-1 items-end justify-center">{items}</div>;
  };

  if (!isOpen) return null;
  return (
    <div className="voice-modal max-w-2xl mx-auto p-4 bg-card rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">AquaLibriaAI Voice Call</h3>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded">Voice: {selectedVoice}</button>
          <button onClick={() => onClose()} className="p-2"><ChevronDown /></button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {isListening ? <Mic /> : <MicOff />}
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted">Status: {callState}</div>
            <div className="text-sm text-foreground mt-1">{transcript || "..."}</div>
          </div>
          <div className="w-12" />
        </div>
      </div>

      <div className="mb-4">{renderWave()}</div>

      <div className="text-sm text-muted">Realtime visual mengikuti audio AI (volume & pitch approx)</div>
    </div>
  );
};

export default VoiceCallModal;
