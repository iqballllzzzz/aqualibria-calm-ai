import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Image, Search, Sparkles, Music, Quote, 
  MessageSquare, ChevronDown, Loader2, Mic, MicOff, AudioLines, Wand2, Crown, User, ImageIcon,
  MoreVertical, Pin, Archive, Edit2, Share2, Trash2, Check,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage, sendResearchQuery, generateImage, searchSpotify, uploadImage, analyzeImage, ChatMessage, generateMessageId, VoiceOption, SUBSCRIPTION_PLANS } from "@/lib/api";
import { ChatSession, saveChatSession, getChatHistory, deleteChatSession, generateSessionId, generateSessionTitle, getPreferences, extractMemoryFromMessage, getAIMemory, getSubscription, canUseFeature, incrementUsage, buildMemoryContext, getChatManagement, togglePinSession, toggleArchiveSession, renameSession, canUseLatentLeaf, canUseModel, incrementModelUsage, getModelUsage } from "@/lib/storage";
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
import TypingAnimation from "@/components/TypingAnimation";
import ImageGalleryModal from "@/components/ImageGalleryModal";
import ArchivedChatsModal from "@/components/ArchivedChatsModal";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mobile viewport height fix
const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

const Chat: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"chat" | "research" | "image" | "spotify" | "quote">("chat");
  const [showQuoteMaker, setShowQuoteMaker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(urlSessionId || generateSessionId());
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("dylan");
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<"aqualibriav1" | "aqualibriav2" | "aqualibriav3">("aqualibriav1");
  
  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLatentLeaf, setShowLatentLeaf] = useState(false);
  const [showMusea, setShowMusea] = useState(false);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [editingSidebarId, setEditingSidebarId] = useState<string | null>(null);
  const [editSidebarTitle, setEditSidebarTitle] = useState("");

  // Chat management
  const [chatManagement, setChatManagement] = useState(getChatManagement());

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

  // Mobile viewport height fix
  useLayoutEffect(() => {
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  useEffect(() => {
    setIsLoadingHistory(true);
    const history = getChatHistory();
    setChatHistory(history);
    setChatManagement(getChatManagement());
    if (urlSessionId) {
      const session = history.find(s => s.id === urlSessionId);
      if (session) {
        setMessages(session.messages);
        setCurrentSessionId(session.id);
      }
    }
    // Simulate loading for skeleton effect
    setTimeout(() => setIsLoadingHistory(false), 300);
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

    const usage = canUseFeature();
    if (!usage.allowed) {
      const waitMsg = usage.waitTime ? ` Tunggu ${Math.floor(usage.waitTime / 60)}:${(usage.waitTime % 60).toString().padStart(2, '0')} lagi.` : "";
      toast({ title: "Limit Tercapai", description: `Anda telah mencapai batas penggunaan.${waitMsg} Upgrade plan untuk lebih banyak!`, variant: "destructive" });
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
            setMessages((prev) => [...prev, { role: "assistant", content: "Here's your generated image:", timestamp: new Date(), id: generateMessageId(), imageUrl: result.imageUrl }]);
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
            // Increment model usage for V2/V3 if free user
            if (subscription.plan === "junior" && selectedModel !== "aqualibriav1") {
              incrementModelUsage(selectedModel);
            }
            result = await sendChatMessage(messageText, currentSessionId, { model: selectedModel, memoryContext });
          }
      }
      
      if (result.success && result.response) {
        extractMemoryFromMessage(result.response, true);
        setMessages((prev) => [...prev, { role: "assistant", content: result.response, timestamp: new Date(), id: generateMessageId() }]);
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
    setShowSidebar(false);
    navigate(`/chat/${session.id}`);
  };

  const handleDeleteSession = (id: string) => { 
    deleteChatSession(id); 
    setChatHistory(getChatHistory()); 
    setChatManagement(getChatManagement());
    if (currentSessionId === id) handleNewChat(); 
  };

  const handlePinSession = (id: string) => {
    togglePinSession(id);
    setChatManagement(getChatManagement());
  };

  const handleArchiveSession = (id: string) => {
    toggleArchiveSession(id);
    setChatManagement(getChatManagement());
    setChatHistory(getChatHistory());
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    renameSession(id, newTitle);
    setChatHistory(getChatHistory());
  };

  const handleShareSession = async (session: ChatSession) => {
    const shareUrl = `${window.location.origin}/shared/${session.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `AquaLibriaAI: ${session.title}`, url: shareUrl }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link disalin!", description: "Link percakapan telah disalin ke clipboard" }); } catch { toast({ title: "Gagal menyalin", variant: "destructive" }); }
  };

  const handleStartSidebarRename = (session: ChatSession) => {
    setEditingSidebarId(session.id);
    setEditSidebarTitle(session.title);
  };

  const handleConfirmSidebarRename = () => {
    if (editingSidebarId && editSidebarTitle.trim()) {
      handleRenameSession(editingSidebarId, editSidebarTitle.trim());
    }
    setEditingSidebarId(null);
    setEditSidebarTitle("");
  };

  const handleQuoteGenerate = (data: QuoteData) => { 
    setMessages((prev) => [
      ...prev, 
      { role: "user", content: `Create quote: "${data.text}" - ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }, 
      { role: "assistant", content: `**"${data.text}"**\n\n— ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }
    ]); 
  };

  const memory = getAIMemory();
  const userName = memory.userName || "User";
  const greeting = `Hai ${userName}! apa yang bisa saya bantu?`;
  const latentLeafAccess = canUseLatentLeaf();

  const plusMenuItems = [
    { icon: Image, label: t("plus.uploadImage"), onClick: () => { fileInputRef.current?.click(); setShowPlusMenu(false); }, locked: false },
    { icon: Sparkles, label: t("plus.generateImage"), onClick: () => { setActiveMode("image"); setShowPlusMenu(false); }, locked: false },
    { icon: Search, label: t("plus.deepResearch"), onClick: () => { setActiveMode("research"); setShowPlusMenu(false); }, locked: false },
    { icon: Music, label: t("plus.spotifySearch"), onClick: () => { setActiveMode("spotify"); setShowPlusMenu(false); }, locked: false },
    { icon: Quote, label: t("plus.quoteMaker"), onClick: () => { setShowQuoteMaker(true); setShowPlusMenu(false); }, locked: false },
    { icon: Wand2, label: `LatentLeaf Edit ${latentLeafAccess.unlimited ? '' : `(${latentLeafAccess.remaining}/10)`}`, onClick: () => { setShowLatentLeaf(true); setShowPlusMenu(false); }, locked: !latentLeafAccess.allowed, exclusive: latentLeafAccess.unlimited },
    { icon: Music, label: "Musea (Coming Soon)", onClick: () => { setShowMusea(true); setShowPlusMenu(false); }, locked: false, comingSoon: true },
  ];

  const filteredHistory = chatHistory.filter(session => session.title.toLowerCase().includes(historySearchQuery.toLowerCase()));

  return (
    <div className="h-screen-safe w-screen overflow-hidden flex flex-col bg-background" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <ChatHistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        sessions={chatHistory} 
        currentSessionId={currentSessionId} 
        onSelectSession={handleSelectSession} 
        onDeleteSession={handleDeleteSession} 
        onNewChat={handleNewChat}
        pinnedSessions={chatManagement.pinnedSessions}
        archivedSessions={chatManagement.archivedSessions}
        onPinSession={handlePinSession}
        onArchiveSession={handleArchiveSession}
        onRenameSession={handleRenameSession}
      />
      
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSidebar(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar z-50 flex flex-col">
              <div className="p-4 flex items-center gap-3 shrink-0">
                <Logo size="sm" />
                <span className="font-bold text-lg text-sidebar-foreground">AquaLibriaAI</span>
              </div>
              
              <div className="px-3 space-y-1 shrink-0">
                <button onClick={handleNewChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">New Chat</span>
                </button>
                <button onClick={() => { setShowImageGallery(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <ImageIcon className="w-5 h-5" />
                  <span className="font-medium">Image Gallery</span>
                </button>
              </div>

              <div className="px-4 mt-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                  <Input type="text" placeholder="Search chats" value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-sidebar-accent border-0 rounded-xl text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-1 focus-visible:ring-purple-500" />
                </div>
              </div>

              <ScrollArea className="flex-1 px-3 mt-3">
                {isLoadingHistory ? (
                  <div className="space-y-2 pb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="px-4 py-3">
                        <Skeleton className="h-4 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <p className="text-center text-sidebar-foreground/50 py-8">Belum ada riwayat chat</p>
                ) : (
                  <div className="space-y-1 pb-4">
                    {filteredHistory.filter(s => !chatManagement.archivedSessions.includes(s.id)).slice(0, 20).map((session) => {
                      const isPinned = chatManagement.pinnedSessions.includes(session.id);
                      const isEditing = editingSidebarId === session.id;
                      return (
                        <div key={session.id} className={`group relative rounded-lg px-4 py-2.5 cursor-pointer transition-colors ${currentSessionId === session.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"}`} onClick={() => !isEditing && handleSelectSession(session)}>
                          <div className="pr-8">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={editSidebarTitle} onChange={(e) => setEditSidebarTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConfirmSidebarRename()} onClick={(e) => e.stopPropagation()} className="flex-1 text-sm text-sidebar-foreground bg-sidebar border border-sidebar-border rounded px-2 py-1 focus:outline-none" autoFocus />
                                <button onClick={(e) => { e.stopPropagation(); handleConfirmSidebarRename(); }} className="p-1 rounded hover:bg-sidebar-accent"><Check className="w-4 h-4 text-green-500" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isPinned && <Pin className="w-3 h-3 text-purple-400 shrink-0" />}
                                <span className="text-sm text-sidebar-foreground truncate">{session.title}</span>
                              </div>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-all"><MoreVertical className="w-4 h-4 text-sidebar-foreground" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartSidebarRename(session); }} className="cursor-pointer"><Edit2 className="w-4 h-4 mr-2" />Rename</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePinSession(session.id); }} className="cursor-pointer"><Pin className="w-4 h-4 mr-2" />{isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveSession(session.id); }} className="cursor-pointer"><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShareSession(session); }} className="cursor-pointer"><Share2 className="w-4 h-4 mr-2" />Share Link</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t border-sidebar-border shrink-0">
                <button onClick={() => { setShowUserPanel(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <User className="w-4 h-4 text-sidebar-foreground" />
                  </div>
                  <span className="flex-1 text-left font-medium text-sidebar-foreground">{userName}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${subscription.plan === "junior" ? "bg-muted text-muted-foreground" : subscription.plan === "senior" ? "bg-purple-500/20 text-purple-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {currentPlan?.name || "Free"}
                  </span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4">
        <button onClick={() => setShowSidebar(true)} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-6 h-6 text-foreground" />
        </button>
        <button onClick={() => setShowUpgradeModal(true)} className="px-4 py-2 rounded-full btn-gradient-purple flex items-center gap-2 text-sm font-semibold shadow-lg">
          <Sparkles className="w-4 h-4" />
          Upgrade Plan
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
                <h1 className="text-4xl font-bold text-foreground mb-4">AquaLibriaAI</h1>
                <p className="text-muted-foreground text-lg">
                  <TypingAnimation text={greeting} highlightWord={`${userName}!`} speed={40} />
                </p>
                {memory.recentTopics.length > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-muted-foreground/60 text-sm mt-2">
                    Terakhir kita bicara tentang: {memory.recentTopics.slice(-1)[0]}
                  </motion.p>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <motion.div key={message.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 overflow-hidden ${message.role === "user" ? "bg-muted text-foreground" : "bg-card border border-border text-foreground"}`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-3">
                        <img src={message.imageUrl} alt="Uploaded" className="rounded-lg max-w-full max-h-48 cursor-pointer" onClick={() => setShowImageViewer(message.imageUrl!)} />
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{message.content}</p>
                    )}
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
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-muted-foreground text-sm">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area - Fixed at bottom with safe area */}
      <div className="shrink-0 p-4 pb-safe" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto">
          {activeMode !== "chat" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-accent">{activeMode === "research" ? "Research Mode" : activeMode === "image" ? "Image Mode" : "Spotify Mode"}</span>
              <button onClick={() => setActiveMode("chat")} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </motion.div>
          )}

          {pendingImageUrl && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={pendingImageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setPendingImageUrl(null)} className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80"><X className="w-3 h-3" /></button>
              </div>
              <span className="text-xs text-muted-foreground">Image ready to analyze</span>
            </motion.div>
          )}

          <div className="relative bg-card border border-border rounded-2xl overflow-visible shadow-md">
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Apa yang anda ingin tahu?" rows={1} className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none p-4 pb-14 max-h-[200px]" />

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 pt-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowPlusMenu(!showPlusMenu)} disabled={isUploadingImage} className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-50">
                    {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Plus className={`w-5 h-5 text-muted-foreground transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />}
                  </button>
                  <AnimatePresence>
                    {showPlusMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                        transition={{ duration: 0.15 }} 
                        className="absolute bottom-full left-0 mb-2 w-60 bg-popover border border-border rounded-xl shadow-elevated z-[60]"
                        style={{ maxHeight: 'calc(var(--vh, 1vh) * 50)' }}
                      >
                        <ScrollArea className="max-h-[50vh]">
                          <div className="py-1">
                            {plusMenuItems.map((item, index) => (
                              <button key={index} onClick={item.locked ? undefined : item.onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.locked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"} text-foreground`}>
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="text-sm flex-1">{item.label}</span>
                                {item.exclusive && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">PRO</span>}
                                {item.comingSoon && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">SOON</span>}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative">
                <button onClick={() => setShowModelSelector(!showModelSelector)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-accent transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {selectedModel === "aqualibriav1" ? "AqualibriaV1" : selectedModel === "aqualibriav2" ? "AqualibriaV2" : "AqualibriaV3"}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showModelSelector && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 5 }} 
                      className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-elevated z-[60] overflow-hidden"
                    >
                      {SUBSCRIPTION_PLANS.map((plan) => {
                        const modelKey = plan.model as "aqualibriav1" | "aqualibriav2" | "aqualibriav3";
                        const isActive = selectedModel === modelKey;
                        
                        // For free users, check if they can use V2/V3
                        let modelAccess = { allowed: true, remaining: 999 };
                        let limitText = "";
                        
                        if (subscription.plan === "junior" && modelKey !== "aqualibriav1") {
                          modelAccess = canUseModel(modelKey);
                          const usage = getModelUsage();
                          if (modelKey === "aqualibriav2") {
                            limitText = `(${90 - usage.v2Count}/90 per 2 hari)`;
                          } else {
                            limitText = `(${45 - usage.v3Count}/45 per 2 hari)`;
                          }
                        }
                        
                        const handleSelectModel = () => {
                          if (!modelAccess.allowed) {
                            toast({
                              title: "Limit Tercapai",
                              description: `Anda telah mencapai batas penggunaan ${plan.modelDisplay}. Reset setiap 2 hari.`,
                              variant: "destructive"
                            });
                            return;
                          }
                          setSelectedModel(modelKey);
                          setShowModelSelector(false);
                        };
                        
                        return (
                          <button 
                            key={plan.id} 
                            onClick={handleSelectModel}
                            className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${!modelAccess.allowed ? "opacity-50" : "hover:bg-accent"} ${isActive ? "bg-accent" : ""}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm text-foreground font-medium">{plan.modelDisplay}</span>
                              {subscription.plan === "junior" && limitText && (
                                <span className="text-xs text-muted-foreground">{limitText}</span>
                              )}
                            </div>
                            {isActive && <span className="w-2 h-2 rounded-full bg-green-500" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                {isListening ? (
                  <button onClick={stopListening} className="p-2.5 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    <MicOff className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={startListening} disabled={isLoading} className="p-2.5 rounded-full hover:bg-accent transition-colors disabled:opacity-40">
                    <Mic className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                <button onClick={inputValue.trim() || pendingImageUrl ? handleSendMessage : () => setShowVoiceCall(true)} disabled={isLoading} className="p-2.5 rounded-full transition-all disabled:opacity-40 bg-foreground text-background hover:bg-foreground/90">
                  {inputValue.trim() || pendingImageUrl ? <Send className="w-5 h-5" /> : <AudioLines className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuoteMaker isOpen={showQuoteMaker} onClose={() => setShowQuoteMaker(false)} onGenerate={handleQuoteGenerate} />
      <VoiceCallModal isOpen={showVoiceCall} onClose={(voiceMessages) => { setShowVoiceCall(false); if (voiceMessages?.length > 0) setMessages((prev) => [...prev, ...voiceMessages]); }} selectedVoice={selectedVoice} onSelectVoice={setSelectedVoice} sessionId={currentSessionId} />
      <UpgradePlanModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <LatentLeafModal isOpen={showLatentLeaf} onClose={() => setShowLatentLeaf(false)} />
      <MuseaModal isOpen={showMusea} onClose={() => setShowMusea(false)} />
      <UserPanel isOpen={showUserPanel} onClose={() => setShowUserPanel(false)} onOpenUpgrade={() => setShowUpgradeModal(true)} onOpenArchivedChats={() => setShowArchivedChats(true)} />
      <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} />
      <ArchivedChatsModal 
        isOpen={showArchivedChats} 
        onClose={() => setShowArchivedChats(false)} 
        sessions={chatHistory} 
        archivedIds={chatManagement.archivedSessions} 
        onRestoreSession={handleArchiveSession}
        onDeleteSession={handleDeleteSession}
        onSelectSession={handleSelectSession}
      />
      
      {/* Image Viewer */}
      <AnimatePresence>
        {showImageViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4" onClick={() => setShowImageViewer(null)}>
            <img src={showImageViewer} alt="View" className="max-w-full max-h-[80vh] rounded-2xl shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
