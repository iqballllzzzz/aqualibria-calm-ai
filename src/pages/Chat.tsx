import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Image, Search, Sparkles, Music, Quote, Moon, Sun, 
  MessageSquare, Code, Globe, ChevronRight, ChevronDown, Loader2, Mic, MicOff, AudioLines, Wand2, Crown,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage, sendResearchQuery, generateImage, searchSpotify, uploadImage, analyzeImage, ChatMessage, generateMessageId, VoiceOption, VOICE_OPTIONS, SUBSCRIPTION_PLANS } from "@/lib/api";
import { ChatSession, saveChatSession, getChatHistory, deleteChatSession, generateSessionId, generateSessionTitle, getPreferences, extractMemoryFromMessage, getAIMemory, getSubscription, canUseFeature, incrementUsage, buildMemoryContext } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import Logo from "@/components/Logo";
import QuoteMaker, { QuoteData } from "@/components/QuoteMaker";
import ChatHistoryPanel from "@/components/ChatHistoryPanel";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageControls from "@/components/MessageControls";
import VoiceCallModal from "@/components/VoiceCallModal";
import UpgradePlanModal from "@/components/UpgradePlanModal";
import LatentLeafModal from "@/components/LatentLeafModal";
import MuseaModal from "@/components/MuseaModal";
import UserPanel from "@/components/UserPanel";

const Chat: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"chat" | "research" | "image" | "spotify" | "quote">("chat");
  const [showQuoteMaker, setShowQuoteMaker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(urlSessionId || generateSessionId());
  const [preferences] = useState(getPreferences());
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("Fenrir");
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // New modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLatentLeaf, setShowLatentLeaf] = useState(false);
  const [showMusea, setShowMusea] = useState(false);
  const [showUserPanel, setShowUserPanel] = useState(false);

  const subscription = getSubscription();
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const { isListening, startListening, stopListening, error: voiceError } = useVoiceChat({
    onTranscript: handleVoiceTranscript,
    selectedVoice,
  });

  useEffect(() => {
    if (voiceError) {
      toast({ title: "Voice Error", description: voiceError, variant: "destructive" });
    }
  }, [voiceError, toast]);

  useEffect(() => {
    setChatHistory(getChatHistory());
    if (urlSessionId) {
      const session = getChatHistory().find(s => s.id === urlSessionId);
      if (session) {
        setMessages(session.messages);
        setCurrentSessionId(session.id);
      }
    }
  }, [urlSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = {
        id: currentSessionId,
        title: generateSessionTitle(messages[0].content),
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveChatSession(session);
      setChatHistory(getChatHistory());
      window.history.replaceState(null, "", `/chat/${currentSessionId}`);
    }
  }, [messages, currentSessionId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    const result = await uploadImage(file);
    setIsUploadingImage(false);

    if (result.success && result.imageUrl) {
      setPendingImageUrl(result.imageUrl);
      toast({ title: "Image ready", description: "Type a question about the image" });
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || isLoading) return;

    // Check usage limit
    const usage = canUseFeature();
    if (!usage.allowed) {
      toast({ 
        title: "Limit Tercapai", 
        description: "Anda telah mencapai batas harian. Upgrade plan untuk lebih banyak!", 
        variant: "destructive" 
      });
      setShowUpgradeModal(true);
      return;
    }

    const messageText = inputValue.trim() || "What is in this image?";
    const userMessage: ChatMessage = { 
      role: "user", 
      content: messageText, 
      timestamp: new Date(),
      id: generateMessageId(),
      imageUrl: pendingImageUrl || undefined,
    };
    
    extractMemoryFromMessage(messageText);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imageToAnalyze = pendingImageUrl;
    setPendingImageUrl(null);
    setIsLoading(true);
    incrementUsage();

    try {
      let result;
      const memoryContext = buildMemoryContext();
      
      switch (activeMode) {
        case "research":
          result = await sendResearchQuery(messageText, currentSessionId);
          break;
        case "image":
          result = await generateImage(messageText);
          if (result.success && result.imageUrl) {
            setMessages((prev) => [...prev, { 
              role: "assistant", 
              content: "Here's your generated image:", 
              timestamp: new Date(),
              id: generateMessageId(),
              imageUrl: result.imageUrl 
            }]);
            setIsLoading(false);
            setActiveMode("chat");
            return;
          }
          break;
        case "spotify":
          const spotifyResult = await searchSpotify(messageText);
          if (spotifyResult.success) {
            const resultText = spotifyResult.results?.slice(0, 5).map((track: any, i: number) => 
              `${i + 1}. **${track.name || track.title}** - ${track.artist || track.artists?.join(", ")}`
            ).join("\n") || "No results found.";
            result = { success: true, response: `**Spotify search results:**\n\n${resultText}` };
          } else result = spotifyResult;
          break;
        default:
          if (imageToAnalyze) {
            result = await analyzeImage(imageToAnalyze, messageText, currentSessionId);
          } else {
            result = await sendChatMessage(messageText, currentSessionId, {
              model: currentPlan?.model,
              memoryContext,
            });
          }
      }
      
      if (result.success && result.response) {
        extractMemoryFromMessage(result.response, true);
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
      setActiveMode("chat");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      handleSendMessage(); 
    } 
  };

  const handleNewChat = () => { 
    const newId = generateSessionId();
    setMessages([]); 
    setCurrentSessionId(newId); 
    setShowHistory(false);
    setShowSidebar(false);
    navigate(`/chat/${newId}`);
  };

  const handleSelectSession = (session: ChatSession) => { 
    setMessages(session.messages); 
    setCurrentSessionId(session.id); 
    setShowHistory(false);
    navigate(`/chat/${session.id}`);
  };

  const handleDeleteSession = (id: string) => { 
    deleteChatSession(id); 
    setChatHistory(getChatHistory()); 
    if (currentSessionId === id) handleNewChat(); 
  };

  const handleQuoteGenerate = (data: QuoteData) => { 
    setMessages((prev) => [
      ...prev, 
      { role: "user", content: `Create quote: "${data.text}" - ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }, 
      { role: "assistant", content: `**"${data.text}"**\n\n— ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }
    ]); 
  };

  const memory = getAIMemory();
  const greeting = memory.userName ? `Hai ${memory.userName}!` : "Hai User!";
  const canUseLatentLeaf = subscription.plan === "senior" || subscription.plan === "superior";

  const plusMenuItems = [
    { icon: Image, label: t("plus.uploadImage"), onClick: () => { fileInputRef.current?.click(); setShowPlusMenu(false); }, locked: false },
    { icon: Sparkles, label: t("plus.generateImage"), onClick: () => { setActiveMode("image"); setShowPlusMenu(false); }, locked: false },
    { icon: Search, label: t("plus.deepResearch"), onClick: () => { setActiveMode("research"); setShowPlusMenu(false); }, locked: false },
    { icon: Music, label: t("plus.spotifySearch"), onClick: () => { setActiveMode("spotify"); setShowPlusMenu(false); }, locked: false },
    { icon: Quote, label: t("plus.quoteMaker"), onClick: () => { setShowQuoteMaker(true); setShowPlusMenu(false); }, locked: false },
    { icon: Wand2, label: "LatentLeaf Edit", onClick: () => { setShowLatentLeaf(true); setShowPlusMenu(false); }, locked: !canUseLatentLeaf, exclusive: true },
    { icon: Music, label: "Musea (Coming Soon)", onClick: () => { setShowMusea(true); setShowPlusMenu(false); }, locked: false, comingSoon: true },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <ChatHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={chatHistory} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onNewChat={handleNewChat} />
      
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/10 z-40" onClick={() => setShowSidebar(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
              <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo size="sm" />
                  <span className="font-bold text-sidebar-foreground">AquaLibriaAI</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-sidebar-accent"><X className="w-5 h-5" /></button>
              </div>
              
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                <button onClick={() => { handleNewChat(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <MessageSquare className="w-5 h-5" /><span>New Chat</span>
                </button>
                <button onClick={() => { setShowHistory(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <Search className="w-5 h-5" /><span>{t("menu.history")}</span>
                </button>
                <button onClick={() => { navigate("/coding"); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <Code className="w-5 h-5" /><span>{t("menu.coding")}</span>
                </button>
                <div className="relative">
                  <button onClick={() => setShowLanguageSelector(!showLanguageSelector)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                    <div className="flex items-center gap-3"><Globe className="w-5 h-5" /><span>{t("menu.language")}</span></div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showLanguageSelector ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showLanguageSelector && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="ml-8 mt-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {languages.map((lang) => (
                            <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageSelector(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${language === lang.code ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}`}>{lang.nativeName}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              <div className="p-3 border-t border-sidebar-border">
                <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{t("menu.theme")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4">
        <button onClick={() => setShowSidebar(true)} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        
        <button onClick={() => setShowUpgradeModal(true)} className="px-4 py-2 rounded-full btn-gradient-purple flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Upgrade Plan
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">AquaLibriaAI</h1>
                <p className="text-foreground-muted mb-1">{greeting} apa yang bisa saya bantu?</p>
                {memory.recentTopics.length > 0 && (
                  <p className="text-foreground-muted/60 text-sm">Terakhir kita bicara tentang: {memory.recentTopics.slice(-1)[0]}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <motion.div key={message.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-chat-user text-foreground" : "bg-chat-ai text-foreground border border-border"}`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-3">
                        <img src={message.imageUrl} alt="Uploaded" className="rounded-lg max-w-full max-h-48 cursor-pointer" onClick={() => setShowImageViewer(message.imageUrl!)} />
                      </div>
                    )}
                    {message.role === "assistant" ? <MarkdownRenderer content={message.content} /> : <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>}
                    {message.imageUrl && message.role === "assistant" && (
                      <div className="mt-3"><img src={message.imageUrl} alt="Generated" className="rounded-lg max-w-full cursor-pointer" onClick={() => setShowImageViewer(message.imageUrl!)} /></div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <MessageControls messageId={message.id || `${index}`} sessionId={currentSessionId} content={message.content} isAssistant={message.role === "assistant"} selectedVoice={selectedVoice} />
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />
                    <span className="text-foreground-muted text-sm">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          {activeMode !== "chat" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <span className="text-xs text-foreground-muted px-2 py-1 rounded-md bg-accent">{activeMode === "research" ? "Research Mode" : activeMode === "image" ? "Image Mode" : "Spotify Mode"}</span>
              <button onClick={() => setActiveMode("chat")} className="text-xs text-foreground-muted hover:text-foreground">Cancel</button>
            </motion.div>
          )}

          {pendingImageUrl && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={pendingImageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setPendingImageUrl(null)} className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80"><X className="w-3 h-3" /></button>
              </div>
              <span className="text-xs text-foreground-muted">Image ready to analyze</span>
            </motion.div>
          )}

          <div className="relative flex items-end gap-2 bg-chat-input border border-border rounded-2xl p-2">
            {/* Plus Menu */}
            <div className="relative">
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} disabled={isUploadingImage} className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-50">
                {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" /> : <Plus className={`w-5 h-5 text-foreground-muted transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />}
              </button>
              <AnimatePresence>
                {showPlusMenu && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-full left-0 mb-2 w-60 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">
                    {plusMenuItems.map((item, index) => (
                      <button key={index} onClick={item.locked ? undefined : item.onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.locked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"} text-foreground`}>
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm flex-1">{item.label}</span>
                        {item.exclusive && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">PRO</span>}
                        {item.comingSoon && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground-muted">SOON</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Apa yang anda ingin tahu?" rows={1} className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none py-2 max-h-[200px]" />

            {/* Model Selector */}
            <div className="relative">
              <button onClick={() => setShowModelSelector(!showModelSelector)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 transition-colors">
                <span className="text-xs text-foreground-muted">{currentPlan?.modelDisplay || "AqualibriaV1"}</span>
                <ChevronDown className={`w-3 h-3 text-foreground-muted transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showModelSelector && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute bottom-full right-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const isLocked = SUBSCRIPTION_PLANS.findIndex(p => p.id === subscription.plan) < SUBSCRIPTION_PLANS.findIndex(p => p.id === plan.id);
                      return (
                        <button key={plan.id} onClick={() => { if (!isLocked) setShowModelSelector(false); }} className={`w-full px-4 py-2.5 text-left transition-colors ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"} ${subscription.plan === plan.id ? "bg-accent" : ""}`}>
                          <span className="text-sm text-foreground">{plan.modelDisplay}</span>
                          {isLocked && <Crown className="w-3 h-3 inline ml-2 text-purple-500" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mic Button */}
            {isListening ? (
              <button onClick={stopListening} className="p-2 rounded-xl bg-destructive text-destructive-foreground animate-pulse"><MicOff className="w-5 h-5" /></button>
            ) : (
              <button onClick={startListening} disabled={isLoading} className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-40"><Mic className="w-5 h-5 text-foreground-muted" /></button>
            )}

            {/* Send / Voice Call Button */}
            {inputValue.trim() || pendingImageUrl ? (
              <button onClick={handleSendMessage} disabled={isLoading} className="p-2.5 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-all">
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setShowVoiceCall(true)} className="p-2.5 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all">
                <AudioLines className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Button - Bottom Left of Input */}
      <button 
        onClick={() => setShowUserPanel(true)}
        className="fixed bottom-24 left-4 flex items-center gap-2 px-3 py-2 rounded-full bg-sidebar border border-sidebar-border hover:bg-sidebar-accent transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <span className="text-xs font-medium text-foreground">{(memory.userName || user?.email || "U")[0].toUpperCase()}</span>
        </div>
        <span className="text-sm text-foreground">{memory.userName || "User"}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${subscription.plan === "junior" ? "bg-muted text-foreground-muted" : "bg-purple-500/20 text-purple-400"}`}>
          {currentPlan?.name || "Free"}
        </span>
      </button>

      {/* Modals */}
      <QuoteMaker isOpen={showQuoteMaker} onClose={() => setShowQuoteMaker(false)} onGenerate={handleQuoteGenerate} />
      <VoiceCallModal isOpen={showVoiceCall} onClose={(voiceMessages) => { setShowVoiceCall(false); if (voiceMessages?.length > 0) setMessages((prev) => [...prev, ...voiceMessages]); }} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice} sessionId={currentSessionId} />
      <UpgradePlanModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <LatentLeafModal isOpen={showLatentLeaf} onClose={() => setShowLatentLeaf(false)} />
      <MuseaModal isOpen={showMusea} onClose={() => setShowMusea(false)} />
      <UserPanel isOpen={showUserPanel} onClose={() => setShowUserPanel(false)} onOpenUpgrade={() => setShowUpgradeModal(true)} />
      
      {/* Image Viewer */}
      <AnimatePresence>
        {showImageViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4" onClick={() => setShowImageViewer(null)}>
            <img src={showImageViewer} alt="View" className="max-w-full max-h-[80vh] rounded-2xl shadow-elevated" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
