import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, ArrowLeft, Image, Loader2, X, Mic, MicOff, AudioLines,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { sendCodingMessage, uploadImage, ChatMessage, generateMessageId, VoiceOption } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import Logo from "@/components/Logo";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageControls from "@/components/MessageControls";
import VoiceCallModal from "@/components/VoiceCallModal";
import { generateSessionId, extractMemoryFromMessage, saveChatSession, ChatSession } from "@/lib/storage";

const CodingPartner: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("dylan");
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  // Handle voice transcript
  const handleVoiceTranscript = (text: string) => {
    setInputValue(text);
  };

  const {
    isListening,
    startListening,
    stopListening,
  } = useVoiceChat({
    onTranscript: handleVoiceTranscript,
    selectedVoice,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Save session when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = {
        id: sessionId,
        title: `Coding: ${messages[0].content.substring(0, 40)}...`,
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCodingPartner: true,
      };
      saveChatSession(session);
    }
  }, [messages, sessionId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    try {
      const { fileToBase64 } = await import("@/lib/api");
      const base64 = await fileToBase64(file);
      setPendingImageUrl(base64);
      toast({ title: "Image ready", description: "Describe what you want to do with this code screenshot" });
    } else {
      toast({ title: "Upload failed", description: result.error || "Failed to upload image", variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || isLoading) return;

    const messageText = inputValue.trim() || "Analyze this code and explain what it does.";
    const userMessage: ChatMessage = { 
      role: "user", 
      content: messageText, 
      timestamp: new Date(),
      id: generateMessageId(),
      imageUrl: pendingImageUrl || undefined,
    };
    
    // Extract memory from user message
    extractMemoryFromMessage(messageText);
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imageToAnalyze = pendingImageUrl;
    setPendingImageUrl(null);
    setIsLoading(true);

    try {
      // Use coding message API with sessionId
      const result = await sendCodingMessage(messageText, sessionId, imageToAnalyze || undefined);
      
      if (result.success && result.response) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: result.response, 
          timestamp: new Date(),
          id: generateMessageId(),
        }]);
      } else {
        toast({ title: "Error", description: result.error || "Failed to get response", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      handleSendMessage(); 
    } 
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border flex items-center px-4 gap-4">
        <button onClick={() => navigate("/chat")} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-medium text-foreground">{t("coding.title")}</span>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <Logo size="lg" className="mx-auto mb-6" />
                <h2 className="text-xl font-medium text-foreground mb-2">{t("coding.empty.title")}</h2>
                <p className="text-foreground-muted">{t("coding.empty.subtitle")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <motion.div 
                  key={message.id || index} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3 }} 
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                    message.role === "user" 
                      ? message.isVoiceChat 
                        ? "bg-foreground/10 text-foreground-muted" 
                        : "bg-chat-user text-foreground"
                      : message.isVoiceChat
                        ? "bg-foreground/5 text-foreground border border-border/50"
                        : "bg-chat-ai text-foreground border border-border"
                  }`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-3">
                        <img 
                          src={message.imageUrl} 
                          alt="Uploaded" 
                          className="rounded-lg max-w-full max-h-48" 
                        />
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      {message.isVoiceChat && (
                        <span className="text-xs text-foreground-muted italic">voice chat</span>
                      )}
                      <div className="flex-1 flex justify-end">
                        <MessageControls 
                          messageId={message.id || `${index}`} 
                          sessionId={sessionId} 
                          content={message.content}
                          isAssistant={message.role === "assistant"}
                          selectedVoice={selectedVoice}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />
                    <span className="text-foreground-muted text-sm">{t("loading.thinking")}</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          {pendingImageUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-2 flex items-center gap-2"
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={pendingImageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPendingImageUrl(null)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                >
                  <X className="w-3 h-3 text-foreground" />
                </button>
              </div>
              <span className="text-xs text-foreground-muted">Code screenshot ready</span>
            </motion.div>
          )}

          <div className="relative flex items-end gap-2 bg-chat-input border border-border rounded-2xl p-2">
            <div className="relative">
              <button 
                onClick={() => setShowPlusMenu(!showPlusMenu)} 
                disabled={isUploadingImage}
                className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" />
                ) : (
                  <Plus className={`w-5 h-5 text-foreground-muted transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />
                )}
              </button>
              <AnimatePresence>
                {showPlusMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                    transition={{ duration: 0.15 }} 
                    className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden"
                  >
                    <button 
                      onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-foreground hover:bg-accent"
                    >
                      <Image className="w-4 h-4" />
                      <span className="text-sm">{t("plus.uploadImage")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <textarea 
              ref={inputRef} 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder={t("coding.placeholder")} 
              rows={1} 
              className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none py-2 max-h-[200px]" 
            />
            {/* Mic Button for Speech-to-Text */}
            {isListening ? (
              <button 
                onClick={stopListening} 
                className="p-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all btn-press animate-pulse"
                title="Stop recording"
              >
                <MicOff className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={startListening} 
                disabled={isLoading}
                className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Voice to text"
              >
                <Mic className="w-5 h-5 text-foreground-muted" />
              </button>
            )}

            {/* Send or Voice Call Button */}
            {inputValue.trim() || pendingImageUrl ? (
              <button 
                onClick={handleSendMessage} 
                disabled={isLoading} 
                className="p-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={() => setShowVoiceCall(true)} 
                className="p-2.5 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all btn-press"
                title="Voice call with AI"
              >
                <AudioLines className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <VoiceCallModal
        isOpen={showVoiceCall}
        onClose={(voiceMessages) => {
          setShowVoiceCall(false);
          if (voiceMessages && voiceMessages.length > 0) {
            setMessages((prev) => [...prev, ...voiceMessages]);
          }
        }}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
        sessionId={sessionId}
      />
    </div>
  );
};

export default CodingPartner;
