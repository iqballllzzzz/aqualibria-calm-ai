import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Image, Settings as SettingsIcon,
  Search, Sparkles, Music, Quote, Moon, Sun, MessageSquare, Code, Globe,
  ChevronRight, Download, ArrowLeft, Loader2, LogOut,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { logOut } from "@/lib/firebase";
import { sendChatMessage, sendResearchQuery, generateImage, searchSpotify, uploadImage, analyzeImage, ChatMessage, generateMessageId } from "@/lib/api";
import { ChatSession, saveChatSession, getChatHistory, deleteChatSession, generateSessionId, generateSessionTitle, getPreferences } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import QuoteMaker, { QuoteData } from "@/components/QuoteMaker";
import ChatHistoryPanel from "@/components/ChatHistoryPanel";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageControls from "@/components/MessageControls";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Update URL
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

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 10MB", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    const result = await uploadImage(file);
    setIsUploadingImage(false);

    if (result.success && result.imageUrl) {
      setPendingImageUrl(result.imageUrl);
      toast({ title: "Image ready", description: "Type a question about the image or just send to analyze" });
    } else {
      toast({ title: "Upload failed", description: result.error || "Failed to upload image", variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || isLoading) return;

    const messageText = inputValue.trim() || "What is in this image? Describe it in detail.";
    const userMessage: ChatMessage = { 
      role: "user", 
      content: messageText, 
      timestamp: new Date(),
      id: generateMessageId(),
      imageUrl: pendingImageUrl || undefined,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imageToAnalyze = pendingImageUrl;
    setPendingImageUrl(null);
    setIsLoading(true);

    try {
      let result;
      switch (activeMode) {
        case "research":
          result = await sendResearchQuery(messageText);
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
            result = await analyzeImage(imageToAnalyze, messageText);
          } else {
            result = await sendChatMessage(messageText);
          }
      }
      
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

  const plusMenuItems = [
    { icon: Image, label: t("plus.uploadImage"), onClick: () => { fileInputRef.current?.click(); setShowPlusMenu(false); } },
    { icon: Sparkles, label: t("plus.generateImage"), onClick: () => { setActiveMode("image"); setShowPlusMenu(false); } },
    { icon: Search, label: t("plus.deepResearch"), onClick: () => { setActiveMode("research"); setShowPlusMenu(false); } },
    { icon: Music, label: t("plus.spotifySearch"), onClick: () => { setActiveMode("spotify"); setShowPlusMenu(false); } },
    { icon: Quote, label: t("plus.quoteMaker"), onClick: () => { setShowQuoteMaker(true); setShowPlusMenu(false); } },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <ChatHistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        sessions={chatHistory} 
        currentSessionId={currentSessionId} 
        onSelectSession={handleSelectSession} 
        onDeleteSession={handleDeleteSession} 
        onNewChat={handleNewChat} 
      />
      
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-foreground/10 z-40" 
              onClick={() => setShowSidebar(false)} 
            />
            <motion.aside 
              initial={{ x: -300 }} 
              animate={{ x: 0 }} 
              exit={{ x: -300 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            >
              <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo size="sm" />
                  <span className="font-medium text-sidebar-foreground">{preferences.aiName}</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <X className="w-5 h-5 text-sidebar-foreground" />
                </button>
              </div>
              
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                {/* Chat History at top */}
                <button 
                  onClick={() => { setShowHistory(true); setShowSidebar(false); }} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>{t("menu.history")}</span>
                </button>

                {/* Search */}
                <button 
                  onClick={() => { setShowHistory(true); setShowSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  <Search className="w-5 h-5" />
                  <span>{t("menu.search")}</span>
                </button>

                {/* Coding Partner */}
                <button 
                  onClick={() => { navigate("/coding"); setShowSidebar(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  <Code className="w-5 h-5" />
                  <span>{t("menu.coding")}</span>
                </button>

                {/* Language */}
                <div className="relative">
                  <button 
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)} 
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5" />
                      <span>{t("menu.language")}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showLanguageSelector ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showLanguageSelector && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {languages.map((lang) => (
                            <button 
                              key={lang.code} 
                              onClick={() => { setLanguage(lang.code); setShowLanguageSelector(false); }} 
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                language === lang.code 
                                  ? "bg-sidebar-accent text-sidebar-foreground" 
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                              }`}
                            >
                              {lang.nativeName}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              <div className="p-3 border-t border-sidebar-border space-y-1">
                <button 
                  onClick={toggleTheme} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{t("menu.theme")}</span>
                </button>
                <button 
                  onClick={() => navigate("/settings")} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span>{t("menu.settings")}</span>
                </button>
                <button 
                  onClick={async () => { await logOut(); navigate("/login"); }} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t("menu.logout")}</span>
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
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-medium text-foreground text-sm">{preferences.aiName}</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors">
          {theme === "dark" ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <Logo size="lg" className="mx-auto mb-6" />
                <h2 className="text-xl font-medium text-foreground mb-2">{t("chat.empty.title")}</h2>
                <p className="text-foreground-muted">{t("chat.empty.subtitle")}</p>
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
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user" 
                      ? "bg-chat-user text-foreground" 
                      : "bg-chat-ai text-foreground border border-border"
                  }`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-3">
                        <img 
                          src={message.imageUrl} 
                          alt="Uploaded" 
                          className="rounded-lg max-w-full max-h-48 cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setShowImageViewer(message.imageUrl!)} 
                        />
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                    {message.imageUrl && message.role === "assistant" && (
                      <div className="mt-3">
                        <img 
                          src={message.imageUrl} 
                          alt="Generated" 
                          className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setShowImageViewer(message.imageUrl!)} 
                        />
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <MessageControls 
                        messageId={message.id || `${index}`} 
                        sessionId={currentSessionId} 
                        content={message.content} 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />
                    <span className="text-foreground-muted text-sm">
                      {activeMode === "research" ? t("loading.research") : 
                       activeMode === "image" ? t("loading.image") : 
                       t("loading.thinking")}
                    </span>
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
        <div className="max-w-3xl mx-auto">
          {activeMode !== "chat" && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-2 flex items-center gap-2"
            >
              <span className="text-xs text-foreground-muted px-2 py-1 rounded-md bg-accent">
                {activeMode === "research" && t("mode.research")}
                {activeMode === "image" && t("mode.image")}
                {activeMode === "spotify" && t("mode.spotify")}
              </span>
              <button onClick={() => setActiveMode("chat")} className="text-xs text-foreground-muted hover:text-foreground">
                {t("mode.cancel")}
              </button>
            </motion.div>
          )}

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
              <span className="text-xs text-foreground-muted">Image ready to analyze</span>
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
                    className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden"
                  >
                    {plusMenuItems.map((item, index) => (
                      <button 
                        key={index} 
                        onClick={item.onClick} 
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-foreground hover:bg-accent"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <textarea 
              ref={inputRef} 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder={t("chat.placeholder")} 
              rows={1} 
              className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none py-2 max-h-[200px]" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={(!inputValue.trim() && !pendingImageUrl) || isLoading} 
              className="p-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      <AnimatePresence>
        {showImageViewer && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button 
                onClick={() => setShowImageViewer(null)} 
                className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <a 
                href={showImageViewer} 
                download="image.png" 
                className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <Download className="w-5 h-5 text-foreground" />
              </a>
            </div>
            <img src={showImageViewer} alt="View" className="max-w-full max-h-[80vh] rounded-2xl shadow-elevated" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <QuoteMaker isOpen={showQuoteMaker} onClose={() => setShowQuoteMaker(false)} onGenerate={handleQuoteGenerate} />
    </div>
  );
};

export default Chat;