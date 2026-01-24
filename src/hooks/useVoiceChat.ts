import { useState, useRef, useCallback, useEffect } from "react";
import { textToSpeechWithFallback, VoiceOption } from "@/lib/api";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceChatProps {
  onTranscript: (text: string) => void;
  selectedVoice: VoiceOption;
}

interface UseVoiceChatReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isLoadingAudio: boolean;
  startListening: () => void;
  stopListening: () => void;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  error: string | null;
}

export const useVoiceChat = ({
  onTranscript,
  selectedVoice,
}: UseVoiceChatProps): UseVoiceChatReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition with multilingual support
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    // Empty string enables automatic language detection (multilingual support)
    recognition.lang = "";

    let finalResult = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalResult = result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results while speaking
      if (interimTranscript) {
        onTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Send final result when recognition ends
      if (finalResult) {
        onTranscript(finalResult);
        finalResult = "";
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setError("Failed to start voice recognition");
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speakText = useCallback(
    async (text: string) => {
      setIsLoadingAudio(true);
      setError(null);

      try {
        // Use TTS with fallback (primary -> HuggingFace)
        const result = await textToSpeechWithFallback(text, selectedVoice);

        if (result.success && result.audioUrl) {
          // Stop any currently playing audio
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          const audio = new Audio(result.audioUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsSpeaking(true);
            setIsLoadingAudio(false);
          };

          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };

          audio.onerror = () => {
            setError("Failed to play audio");
            setIsSpeaking(false);
            setIsLoadingAudio(false);
            audioRef.current = null;
          };

          await audio.play();
        } else {
          throw new Error(result.error || "Failed to generate speech");
        }
      } catch (err: any) {
        console.error("TTS Error:", err);
        setError(err.message || "Failed to generate speech");
        setIsLoadingAudio(false);
      }
    },
    [selectedVoice]
  );

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    isLoadingAudio,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    error,
  };
};
