import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Image, FileText, Video, Settings as SettingsIcon,
  Search, Sparkles, Music, Quote, Moon, Sun, MessageSquare, Code, Globe,
  ChevronRight, Download, ArrowLeft, Loader2, LogOut,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { logOut } from "@/lib/firebase";
import { sendChatMessage, sendResearchQuery, generateImage, searchSpotify, ChatMessage, APIStatus, testAllAPIs } from "@/lib/api";
import { ChatSession, saveChatSession, getChatHistory, deleteChatSession, generateSessionId, generateSessionTitle, getPreferences } from "@/lib/storage";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import QuoteMaker, { QuoteData } from "@/components/QuoteMaker";
import FileUploadModal from "@/components/FileUploadModal";
import ChatHistoryPanel from "@/components/ChatHistoryPanel";

const Chat: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [activeMode, setActiveMode] = useState<"chat" | "research" | "image" | "spotify" | "quote">("chat");
  const [showQuoteMaker, setShowQuoteMaker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState<"image" | "video" | "file" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [preferences] = useState(getPreferences());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const testAPIs = async () => {
      const status = await testAllAPIs();
      setApiStatus(status);
      if (!status.chat) toast({ title: "Chat API unavailable", variant: "destructive" });
    };
    testAPIs();
    setChatHistory(getChatHistory());
  }, []);

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
    if (messages.length > 0 && currentSessionId) {
      const session: ChatSession = {
        id: currentSessionId,
        title: generateSessionTitle(messages[0].content),
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveChatSession(session);
      setChatHistory(getChatHistory());
    }
  }, [messages, currentSessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!currentSessionId) setCurrentSessionId(generateSessionId());

    const userMessage: ChatMessage = { role: "user", content: inputValue.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      let result;
      switch (activeMode) {
        case "research":
          result = await sendResearchQuery(userMessage.content);
          break;
        case "image":
          result = await generateImage(userMessage.content);
          if (result.success && result.imageUrl) {
            setMessages((prev) => [...prev, { role: "assistant", content: "Here's your generated image:", timestamp: new Date(), imageUrl: result.imageUrl }]);
            setIsLoading(false);
            setActiveMode("chat");
            return;
          }
          break;
        case "spotify":
          const spotifyResult = await searchSpotify(userMessage.content);
          if (spotifyResult.success) {
            const resultText = spotifyResult.results?.slice(0, 5).map((track: any, i: number) => `${i + 1}. ${track.name || track.title} - ${track.artist || track.artists?.join(", ")}`).join("\n") || "No results found.";
            result = { success: true, response: `Spotify search results:\n\n${resultText}` };
          } else result = spotifyResult;
          break;
        default:
          result = await sendChatMessage(userMessage.content);
      }
      if (result.success && result.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.response, timestamp: new Date() }]);
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

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
  const handleNewChat = () => { setMessages([]); setCurrentSessionId(generateSessionId()); setShowHistory(false); };
  const handleSelectSession = (session: ChatSession) => { setMessages(session.messages); setCurrentSessionId(session.id); setShowHistory(false); };
  const handleDeleteSession = (id: string) => { deleteChatSession(id); setChatHistory(getChatHistory()); if (currentSessionId === id) handleNewChat(); };
  const handleQuoteGenerate = (data: QuoteData) => { setMessages((prev) => [...prev, { role: "user", content: `Create quote: "${data.text}" - ${data.author || "Unknown"}`, timestamp: new Date() }, { role: "assistant", content: `**"${data.text}"**\n\n— ${data.author || "Unknown"}`, timestamp: new Date() }]); };
  const handleFileUpload = (file: File, type: string) => { toast({ title: "File uploaded", description: `${file.name} ready for analysis` }); };

  const plusMenuItems = [
    { icon: Image, label: t("plus.uploadImage"), onClick: () => { setShowFileUpload("image"); setShowPlusMenu(false); } },
    { icon: Video, label: t("plus.uploadVideo"), onClick: () => { setShowFileUpload("video"); setShowPlusMenu(false); } },
    { icon: FileText, label: t("plus.uploadFile"), onClick: () => { setShowFileUpload("file"); setShowPlusMenu(false); } },
    { icon: SettingsIcon, label: t("plus.chooseModel"), disabled: true },
    { icon: Sparkles, label: t("plus.generateImage"), disabled: !apiStatus?.imageGeneration, onClick: () => { setActiveMode("image"); setShowPlusMenu(false); } },
    { icon: Search, label: t("plus.deepResearch"), disabled: !apiStatus?.research, onClick: () => { setActiveMode("research"); setShowPlusMenu(false); } },
    { icon: Music, label: t("plus.spotifySearch"), disabled: !apiStatus?.spotify, onClick: () => { setActiveMode("spotify"); setShowPlusMenu(false); } },
    { icon: Quote, label: t("plus.quoteMaker"), onClick: () => { setShowQuoteMaker(true); setShowPlusMenu(false); } },
  ];

  return (
    <div className="h-screen flex bg-background">
      <ChatHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={chatHistory} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onNewChat={handleNewChat} />
      
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/10 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
              <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-3"><Logo size="sm" /><span className="font-medium text-sidebar-foreground">{preferences.aiName}</span></div>
                <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"><X className="w-5 h-5 text-sidebar-foreground" /></button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                <button onClick={() => { setShowHistory(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"><MessageSquare className="w-5 h-5" /><span>{t("menu.history")}</span></button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"><Code className="w-5 h-5" /><span>{t("menu.coding")}</span></button>
                <div className="relative">
                  <button onClick={() => setShowLanguageSelector(!showLanguageSelector)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                    <div className="flex items-center gap-3"><Globe className="w-5 h-5" /><span>{t("menu.language")}</span></div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showLanguageSelector ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence>{showLanguageSelector && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="ml-8 mt-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">{languages.map((lang) => (<button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageSelector(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${language === lang.code ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}`}>{lang.nativeName}</button>))}</div></motion.div>)}</AnimatePresence>
                </div>
              </nav>
              <div className="p-3 border-t border-sidebar-border space-y-1">
                <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">{theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}<span>{t("menu.theme")}</span></button>
                <button onClick={() => navigate("/settings")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"><SettingsIcon className="w-5 h-5" /><span>{t("menu.settings")}</span></button>
                <button onClick={async () => { await logOut(); navigate("/login"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-destructive"><LogOut className="w-5 h-5" /><span>{t("menu.logout")}</span></button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <button onClick={() => setShowSidebar(true)} className="p-2 rounded-lg hover:bg-accent transition-colors"><Menu className="w-5 h-5 text-foreground" /></button>
          <div className="flex items-center gap-2"><Logo size="sm" /><span className="font-medium text-foreground text-sm">{preferences.aiName}</span></div>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors">{theme === "dark" ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}</button>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center min-h-[50vh]">
                <div className="text-center"><Logo size="lg" className="mx-auto mb-6" /><h2 className="text-xl font-medium text-foreground mb-2">{t("chat.empty.title")}</h2><p className="text-foreground-muted">{t("chat.empty.subtitle")}</p></div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-chat-user text-foreground" : "bg-chat-ai text-foreground border border-border"}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.imageUrl && (<div className="mt-3"><img src={message.imageUrl} alt="Generated" className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowImageViewer(message.imageUrl!)} /></div>)}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start"><div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-foreground-muted" /><span className="text-foreground-muted text-sm">{activeMode === "research" ? t("loading.research") : activeMode === "image" ? t("loading.image") : t("loading.thinking")}</span></div></motion.div>)}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            {activeMode !== "chat" && (<motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2"><span className="text-xs text-foreground-muted px-2 py-1 rounded-md bg-accent">{activeMode === "research" && t("mode.research")}{activeMode === "image" && t("mode.image")}{activeMode === "spotify" && t("mode.spotify")}</span><button onClick={() => setActiveMode("chat")} className="text-xs text-foreground-muted hover:text-foreground">{t("mode.cancel")}</button></motion.div>)}
            <div className="relative flex items-end gap-2 bg-chat-input border border-border rounded-2xl p-2">
              <div className="relative">
                <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="p-2 rounded-xl hover:bg-accent transition-colors"><Plus className={`w-5 h-5 text-foreground-muted transition-transform ${showPlusMenu ? "rotate-45" : ""}`} /></button>
                <AnimatePresence>{showPlusMenu && (<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">{plusMenuItems.map((item, index) => (<button key={index} onClick={item.onClick} disabled={item.disabled} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.disabled ? "text-foreground-muted/50 cursor-not-allowed" : "text-foreground hover:bg-accent"}`}><item.icon className="w-4 h-4" /><span className="text-sm">{item.label}</span>{item.disabled && <span className="ml-auto text-xs text-foreground-muted">Soon</span>}</button>))}</motion.div>)}</AnimatePresence>
              </div>
              <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={t("chat.placeholder")} rows={1} className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none py-2 max-h-[200px]" />
              <button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} className="p-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>{showImageViewer && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"><div className="absolute top-4 left-4 right-4 flex items-center justify-between"><button onClick={() => setShowImageViewer(null)} className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"><ArrowLeft className="w-5 h-5 text-foreground" /></button><a href={showImageViewer} download="generated-image.png" className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"><Download className="w-5 h-5 text-foreground" /></a></div><img src={showImageViewer} alt="Generated" className="max-w-full max-h-[80vh] rounded-2xl shadow-elevated" /></motion.div>)}</AnimatePresence>
      
      <QuoteMaker isOpen={showQuoteMaker} onClose={() => setShowQuoteMaker(false)} onGenerate={handleQuoteGenerate} />
      {showFileUpload && <FileUploadModal isOpen={!!showFileUpload} onClose={() => setShowFileUpload(null)} onUpload={handleFileUpload} type={showFileUpload} />}
    </div>
  );
};

export default Chat;
