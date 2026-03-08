import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, ArrowLeft, Loader2, X, Mic, MicOff, AudioLines,
  Code2, Terminal, FileCode, Bug, Rocket, Lightbulb, Copy, Check,
  ChevronDown, Sparkles, FolderOpen, GitBranch, Braces,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { sendCodingMessage, ChatMessage, generateMessageId, VoiceOption } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import Logo from "@/components/Logo";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageControls from "@/components/MessageControls";
import VoiceCallModal from "@/components/VoiceCallModal";
import SmartThinkingIndicator, { classifyMessageComplexity } from "@/components/SmartThinkingIndicator";
import { generateSessionId, extractMemoryFromMessage, saveChatSession, ChatSession } from "@/lib/storage";
import { fileToBase64 } from "@/lib/api";

const QUICK_PROMPTS = [
  { icon: Bug, label: "Debug code", prompt: "Help me debug this code:" },
  { icon: Rocket, label: "Optimize", prompt: "Optimize this code for performance:" },
  { icon: Lightbulb, label: "Explain", prompt: "Explain this code step by step:" },
  { icon: FileCode, label: "Generate", prompt: "Write code for:" },
  { icon: GitBranch, label: "Refactor", prompt: "Refactor this code to be cleaner:" },
  { icon: Braces, label: "Convert", prompt: "Convert this code to:" },
];

const CodingPartner: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("aurora");
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [messageComplexity, setMessageComplexity] = useState<"simple" | "medium" | "complex">("medium");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleVoiceTranscript = useCallback((text: string) => setInputValue(text), []);
  const { isListening, startListening, stopListening } = useVoiceChat({ onTranscript: handleVoiceTranscript, selectedVoice });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`; }
  }, [inputValue]);

  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = { id: sessionId, title: `Coding: ${messages[0].content.substring(0, 40)}...`, messages, createdAt: new Date(), updatedAt: new Date(), isCodingPartner: true };
      saveChatSession(session);
    }
  }, [messages, sessionId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Error", description: "Please select an image file", variant: "destructive" }); return; }
    setIsUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      setPendingImageUrl(base64);
      toast({ title: "Image ready", description: "Describe what you want to do with this code screenshot" });
    } catch { toast({ title: "Upload failed", description: "Failed to process image", variant: "destructive" }); }
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || isLoading) return;
    const messageText = inputValue.trim() || "Analyze this code and explain what it does.";
    setMessageComplexity(classifyMessageComplexity(messageText));
    const userMessage: ChatMessage = { role: "user", content: messageText, timestamp: new Date(), id: generateMessageId(), imageUrl: pendingImageUrl || undefined };
    extractMemoryFromMessage(messageText);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imageToAnalyze = pendingImageUrl;
    setPendingImageUrl(null);
    setIsLoading(true);
    try {
      const result = await sendCodingMessage(messageText, sessionId, imageToAnalyze || undefined);
      if (result.success && result.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.response, timestamp: new Date(), id: generateMessageId() }]);
      } else { toast({ title: "Error", description: result.error || "Failed to get response", variant: "destructive" }); }
    } catch { toast({ title: "Error", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const LANG_OPTIONS = [
    { value: "auto", label: "Auto Detect" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "rust", label: "Rust" },
    { value: "go", label: "Go" },
    { value: "java", label: "Java" },
    { value: "c++", label: "C++" },
    { value: "swift", label: "Swift" },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Header */}
      <header className="h-13 shrink-0 border-b border-border flex items-center px-4 gap-3 bg-card/50 backdrop-blur-xl">
        <button onClick={() => navigate("/chat")} className="p-2 -ml-1 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm">Coding Partner</span>
            <p className="text-[10px] text-foreground-muted leading-tight">by AquaLibriaAI</p>
          </div>
        </div>

        {/* Language selector */}
        <div className="relative">
          <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-xs font-medium text-foreground">
            <Code2 className="w-3.5 h-3.5" />
            <span>{LANG_OPTIONS.find(l => l.value === selectedLanguage)?.label || "Auto"}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showLangMenu && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full right-0 mt-1.5 w-44 bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden"
                >
                  {LANG_OPTIONS.map(lang => (
                    <button
                      key={lang.value}
                      onClick={() => { setSelectedLanguage(lang.value); setShowLangMenu(false); }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-medium transition-colors flex items-center justify-between ${selectedLanguage === lang.value ? "bg-accent text-foreground" : "text-foreground-muted hover:bg-accent/50 hover:text-foreground"}`}
                    >
                      <span>{lang.label}</span>
                      {selectedLanguage === lang.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center min-h-[60vh]">
              {/* Hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Terminal className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Coding Partner</h1>
                <p className="text-foreground-muted text-sm max-w-md mx-auto">Your AI pair programmer. Debug, refactor, generate, and learn — powered by AquaLibriaAI.</p>
              </motion.div>

              {/* Quick Action Grid */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto">
                {QUICK_PROMPTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      onClick={() => setInputValue(item.prompt)}
                      className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-4 h-4 text-foreground-muted group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Tips */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-center">
                <p className="text-[11px] text-foreground-muted">
                  💡 Tip: Paste your code directly or upload a screenshot for analysis
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-5 pb-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[90%] overflow-hidden ${
                    message.role === "user"
                      ? "bg-chat-user rounded-2xl rounded-br-md px-4 py-3"
                      : "px-1 py-1"
                  }`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-2.5">
                        <img src={message.imageUrl} alt="Code screenshot" className="rounded-xl max-w-full max-h-48" />
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed break-words text-sm text-foreground" style={{ overflowWrap: 'anywhere' }}>{message.content}</p>
                    )}
                    <div className="mt-1.5 flex justify-end">
                      <MessageControls
                        messageId={message.id || `${index}`}
                        sessionId={sessionId}
                        content={message.content}
                        isAssistant={message.role === "assistant"}
                        selectedVoice={selectedVoice}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              <SmartThinkingIndicator isLoading={isLoading} messageComplexity={messageComplexity} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-3 bg-card/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto">
          {pendingImageUrl && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                <img src={pendingImageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setPendingImageUrl(null)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 hover:bg-background"><X className="w-3 h-3" /></button>
              </div>
              <span className="text-xs text-foreground-muted">📸 Code screenshot ready</span>
            </motion.div>
          )}

          <div className="relative bg-card border border-border rounded-2xl overflow-visible shadow-sm">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste code, describe a problem, or ask anything..."
              rows={1}
              className="w-full bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none px-4 pt-3 pb-12 max-h-[200px] text-sm font-mono"
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-2">
              <div className="flex items-center gap-0.5">
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-50">
                  {isUploadingImage ? <Loader2 className="w-[18px] h-[18px] animate-spin text-foreground-muted" /> : <FolderOpen className="w-[18px] h-[18px] text-foreground-muted" />}
                </button>
              </div>

              <div className="flex items-center gap-0.5">
                {isListening ? (
                  <button onClick={stopListening} className="p-2 rounded-xl bg-destructive text-destructive-foreground animate-pulse"><MicOff className="w-[18px] h-[18px]" /></button>
                ) : (
                  <button onClick={inputValue.trim() || pendingImageUrl ? handleSendMessage : startListening} disabled={isLoading} className={`p-2 rounded-xl transition-all disabled:opacity-40 ${inputValue.trim() || pendingImageUrl ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    {inputValue.trim() || pendingImageUrl ? <Send className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px] text-foreground-muted" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <VoiceCallModal isOpen={showVoiceCall} onClose={(voiceMessages) => { setShowVoiceCall(false); if (voiceMessages?.length > 0) setMessages((prev) => [...prev, ...voiceMessages]); }} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice} sessionId={sessionId} />
    </div>
  );
};

export default CodingPartner;
