import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Search, Sparkles, Music, Quote,
  MessageSquare, ChevronDown, Loader2, Mic, MicOff, AudioLines, Leaf, Crown, User, ImageIcon,
  MoreVertical, Pin, Archive, Edit2, Share2, Trash2, Check,
  Camera, FileText, Youtube, Image as LucideImage,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage, sendResearchQuery, generateImage, searchSpotify, uploadImage, analyzeImage, analyzeFile, analyzeYouTube, fileToBase64, ChatMessage, generateMessageId, VoiceOption, SUBSCRIPTION_PLANS } from "@/lib/api";
import { ChatSession, saveChatSession, getChatHistory, deleteChatSession, generateSessionId, generateSessionTitle, getPreferences, extractMemoryFromMessage, getAIMemory, getSubscription, canUseFeature, incrementUsage, buildMemoryContext, getChatManagement, togglePinSession, toggleArchiveSession, renameSession, canUseLatentLeaf, canUseModel, incrementModelUsage, getModelUsage } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Greetings in different languages
const GREETINGS = [
  "Where should we start?",
  "Mau mulai dari mana?",
  "어디서 시작할까요?",
  "どこから始めましょうか？",
  "Par où commencer ?",
  "¿Por dónde empezamos?",
];

// Quick action suggestions
const QUICK_ACTIONS = [
  { emoji: "🍃", label: "Create image", action: "latentleaf" },
  { emoji: "🎸", label: "Create music", action: "musea" },
  { emoji: "📚", label: "Help me learn", action: "learn" },
  { emoji: "✍️", label: "Write anything", action: "write" },
  { emoji: "💡", label: "Boost my day", action: "boost" },
];

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
  const [pendingImageData, setPendingImageData] = useState<string | null>(null);
  const [pendingFileData, setPendingFileData] = useState<{ data: string; name: string; type: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("dylan");
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<"aqualibriav1" | "aqualibriav2" | "aqualibriav3">("aqualibriav1");
  const [showPromoCard, setShowPromoCard] = useState(true);
  const [randomGreeting, setRandomGreeting] = useState("");
  
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

  const [chatManagement, setChatManagement] = useState(getChatManagement());
  const subscription = getSubscription();
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscript = useCallback((text: string) => setInputValue(text), []);
  const { isListening, startListening, stopListening, error: voiceError } = useVoiceChat({ onTranscript: handleVoiceTranscript, selectedVoice });

  useEffect(() => { if (voiceError) toast({ title: "Voice Error", description: voiceError, variant: "destructive" }); }, [voiceError, toast]);

  // Set random greeting
  useEffect(() => {
    setRandomGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  // Promo card - show max 4 times per day
  useEffect(() => {
    const today = new Date().toDateString();
    const promoData = JSON.parse(localStorage.getItem("aqua-promo") || "{}");
    if (promoData.date !== today) {
      localStorage.setItem("aqua-promo", JSON.stringify({ date: today, count: 0, dismissed: false }));
    } else if (promoData.count >= 4 || promoData.dismissed) {
      setShowPromoCard(false);
    }
  }, []);

  const dismissPromo = () => {
    const today = new Date().toDateString();
    const promoData = JSON.parse(localStorage.getItem("aqua-promo") || "{}");
    promoData.count = (promoData.count || 0) + 1;
    if (promoData.count >= 4) promoData.dismissed = true;
    promoData.date = today;
    localStorage.setItem("aqua-promo", JSON.stringify(promoData));
    setShowPromoCard(false);
  };

  useLayoutEffect(() => {
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    return () => { window.removeEventListener('resize', setVH); window.removeEventListener('orientationchange', setVH); };
  }, []);

  useEffect(() => {
    setIsLoadingHistory(true);
    const history = getChatHistory();
    setChatHistory(history);
    setChatManagement(getChatManagement());
    if (urlSessionId) {
      const session = history.find(s => s.id === urlSessionId);
      if (session) { setMessages(session.messages); setCurrentSessionId(session.id); }
    }
    setTimeout(() => setIsLoadingHistory(false), 300);
  }, [urlSessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`; }
  }, [inputValue]);

  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = { id: currentSessionId, title: generateSessionTitle(messages[0].content), messages, createdAt: new Date(), updatedAt: new Date() };
      saveChatSession(session);
      setChatHistory(getChatHistory());
      window.history.replaceState(null, "", `/chat/${currentSessionId}`);
    }
  }, [messages, currentSessionId]);

  // Handle image upload (camera/gallery)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({ title: "Error", description: "Please select an image or video file", variant: "destructive" });
      return;
    }
    setIsUploadingImage(true);
    try {
      const base64 = await fileToBase64(file);
      setPendingImageData(base64);
      toast({ title: "Ready", description: "Type a question about the image" });
    } catch {
      toast({ title: "Error", description: "Failed to process file", variant: "destructive" });
    }
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle document upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      toast({ title: "Error", description: "Please select a PDF, DOC, DOCX, or TXT file", variant: "destructive" });
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setPendingFileData({ data: base64, name: file.name, type: file.type });
      toast({ title: "File ready", description: `${file.name} loaded. Type a question about it.` });
    } catch {
      toast({ title: "Error", description: "Failed to process file", variant: "destructive" });
    }
    if (docInputRef.current) docInputRef.current.value = "";
  };

  // Detect YouTube URL in message
  const extractYouTubeUrl = (text: string): string | null => {
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/;
    const match = text.match(ytRegex);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageData && !pendingFileData) || isLoading) return;

    const usage = canUseFeature();
    if (!usage.allowed) {
      toast({ title: "Limit Tercapai", description: "Upgrade plan untuk lebih banyak!", variant: "destructive" });
      setShowUpgradeModal(true);
      return;
    }

    const messageText = inputValue.trim() || (pendingImageData ? "Apa yang ada di gambar ini?" : "Analisis file ini");
    const userMessage: ChatMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date(),
      id: generateMessageId(),
      imageUrl: pendingImageData || undefined,
      fileData: pendingFileData?.data,
      fileName: pendingFileData?.name,
      fileType: pendingFileData?.type,
    };

    extractMemoryFromMessage(messageText);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imageToAnalyze = pendingImageData;
    const fileToAnalyze = pendingFileData;
    const youtubeUrl = extractYouTubeUrl(messageText);
    setPendingImageData(null);
    setPendingFileData(null);
    setIsLoading(true);
    incrementUsage();

    if (user) {
      logActivity(user.uid, `chat_${activeMode}`, { model: selectedModel, hasImage: !!imageToAnalyze, hasFile: !!fileToAnalyze, hasYoutube: !!youtubeUrl }, user.email || undefined, user.displayName || undefined);
    }

    try {
      let result;
      const memoryContext = buildMemoryContext();
      
      // Build conversation history for context
      const conversationHistory = messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
        ...(m.imageUrl && m.role === "user" ? { imageData: m.imageUrl } : {}),
        ...(m.fileData && m.role === "user" ? { fileData: m.fileData } : {}),
      }));

      switch (activeMode) {
        case "research":
          result = await sendChatMessage(messageText, currentSessionId, { isResearchMode: true, model: selectedModel, memoryContext, conversationHistory });
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
          result = await sendChatMessage(messageText, currentSessionId, {
            imageData: imageToAnalyze || undefined,
            fileData: fileToAnalyze?.data,
            model: selectedModel,
            memoryContext,
            youtubeUrl: youtubeUrl || undefined,
            conversationHistory,
          });
          if (subscription.plan === "junior" && selectedModel !== "aqualibriav1") incrementModelUsage(selectedModel);
      }

      if (result?.success && result?.response) {
        extractMemoryFromMessage(result.response, true);
        setMessages((prev) => [...prev, { role: "assistant", content: result.response!, timestamp: new Date(), id: generateMessageId() }]);
      } else {
        toast({ title: "Error", description: result?.error || "Failed to get response", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setActiveMode("chat");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
  const handleNewChat = () => { const newId = generateSessionId(); setMessages([]); setCurrentSessionId(newId); setShowHistory(false); setShowSidebar(false); navigate(`/chat/${newId}`); };
  const handleSelectSession = (session: ChatSession) => { setMessages(session.messages); setCurrentSessionId(session.id); setShowHistory(false); setShowSidebar(false); navigate(`/chat/${session.id}`); };
  const handleDeleteSession = (id: string) => { deleteChatSession(id); setChatHistory(getChatHistory()); setChatManagement(getChatManagement()); if (currentSessionId === id) handleNewChat(); };
  const handlePinSession = (id: string) => { togglePinSession(id); setChatManagement(getChatManagement()); };
  const handleArchiveSession = (id: string) => { toggleArchiveSession(id); setChatManagement(getChatManagement()); setChatHistory(getChatHistory()); };
  const handleRenameSession = (id: string, newTitle: string) => { renameSession(id, newTitle); setChatHistory(getChatHistory()); };
  const handleShareSession = async (session: ChatSession) => {
    const shareUrl = `${window.location.origin}/shared/${session.id}`;
    if (navigator.share) { try { await navigator.share({ title: `AquaLibriaAI: ${session.title}`, url: shareUrl }); return; } catch {} }
    try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link disalin!" }); } catch { toast({ title: "Gagal menyalin", variant: "destructive" }); }
  };
  const handleStartSidebarRename = (session: ChatSession) => { setEditingSidebarId(session.id); setEditSidebarTitle(session.title); };
  const handleConfirmSidebarRename = () => { if (editingSidebarId && editSidebarTitle.trim()) handleRenameSession(editingSidebarId, editSidebarTitle.trim()); setEditingSidebarId(null); setEditSidebarTitle(""); };
  const handleQuoteGenerate = (data: QuoteData) => {
    setMessages((prev) => [...prev, { role: "user", content: `Create quote: "${data.text}" - ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }, { role: "assistant", content: `**"${data.text}"**\n\n— ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }]);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "latentleaf": setShowLatentLeaf(true); break;
      case "musea": setShowMusea(true); break;
      case "learn": setInputValue("Help me learn something new today"); break;
      case "write": setInputValue("Help me write "); break;
      case "boost": setInputValue("Give me a motivational boost for today!"); break;
    }
  };

  const memory = getAIMemory();
  const userName = memory.userName || user?.displayName?.split(" ")[0] || "User";
  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();
  const latentLeafAccess = canUseLatentLeaf();

  const filteredHistory = chatHistory.filter(session => session.title.toLowerCase().includes(historySearchQuery.toLowerCase()));

  const modelDisplayName = selectedModel === "aqualibriav1" ? "V1" : selectedModel === "aqualibriav2" ? "V2" : "V3";

  return (
    <div className="h-screen-safe w-screen overflow-hidden flex flex-col bg-background" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleImageUpload} className="hidden" capture="environment" />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv" onChange={handleDocUpload} className="hidden" />

      <ChatHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={chatHistory} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onNewChat={handleNewChat} pinnedSessions={chatManagement.pinnedSessions} archivedSessions={chatManagement.archivedSessions} onPinSession={handlePinSession} onArchiveSession={handleArchiveSession} onRenameSession={handleRenameSession} />

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
                  <MessageSquare className="w-5 h-5" /><span className="font-medium">New Chat</span>
                </button>
                <button onClick={() => { setShowImageGallery(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <ImageIcon className="w-5 h-5" /><span className="font-medium">Image Gallery</span>
                </button>
              </div>
              <div className="px-4 mt-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                  <Input type="text" placeholder="Search chats" value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-sidebar-accent border-0 rounded-xl text-sidebar-foreground placeholder:text-sidebar-foreground/50" />
                </div>
              </div>

              <ScrollArea className="flex-1 px-3 mt-3">
                {isLoadingHistory ? (
                  <div className="space-y-2 pb-4">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full rounded" /></div>))}</div>
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
                                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-sidebar-accent transition-all"><MoreVertical className="w-4 h-4 text-sidebar-foreground" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartSidebarRename(session); }} className="cursor-pointer"><Edit2 className="w-4 h-4 mr-2" />Rename</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePinSession(session.id); }} className="cursor-pointer"><Pin className="w-4 h-4 mr-2" />{isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveSession(session.id); }} className="cursor-pointer"><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShareSession(session); }} className="cursor-pointer"><Share2 className="w-4 h-4 mr-2" />Share</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="cursor-pointer text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">{userInitial}</div>
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
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-semibold text-foreground">AquaLibriaAI</span>
        </div>
        <button onClick={() => { setShowUserPanel(true); }} className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {userInitial}
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col min-h-[60vh] justify-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
                <p className="text-muted-foreground text-lg mb-1">Hi {userName}</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{randomGreeting}</h1>
              </motion.div>

              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="space-y-3 mb-6">
                {QUICK_ACTIONS.map((qa, i) => (
                  <motion.button
                    key={qa.action}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    onClick={() => handleQuickAction(qa.action)}
                    className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-secondary hover:bg-accent transition-colors text-foreground text-sm font-medium w-fit"
                  >
                    <span className="text-lg">{qa.emoji}</span>
                    <span>{qa.label}</span>
                  </motion.button>
                ))}
              </motion.div>

              {/* Promo Card - LatentLeaf */}
              <AnimatePresence>
                {showPromoCard && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.5 }}
                    className="bg-secondary rounded-2xl p-4 flex items-center gap-4"
                  >
                    <button onClick={dismissPromo} className="shrink-0 p-1 hover:bg-accent rounded-full transition-colors">
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">Edit images, better of all. Meet LatentLeaf 🍃.</p>
                    </div>
                    <button onClick={() => { setShowLatentLeaf(true); dismissPromo(); }} className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shrink-0">
                      Try it
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <motion.div key={message.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 overflow-hidden ${message.role === "user" ? "bg-secondary text-foreground" : "text-foreground"}`}>
                    {message.imageUrl && message.role === "user" && (
                      <div className="mb-3">
                        <img src={message.imageUrl} alt="Uploaded" className="rounded-lg max-w-full max-h-48 cursor-pointer" onClick={() => setShowImageViewer(message.imageUrl!)} />
                      </div>
                    )}
                    {message.fileName && message.role === "user" && (
                      <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">{message.fileName}</span>
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed break-words" style={{ overflowWrap: 'anywhere' }}>{message.content}</p>
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
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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

      {/* Input Area */}
      <div className="shrink-0 p-4 pb-safe" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto">
          {activeMode !== "chat" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-accent">{activeMode === "research" ? "Research Mode" : activeMode === "image" ? "Image Mode" : "Spotify Mode"}</span>
              <button onClick={() => setActiveMode("chat")} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </motion.div>
          )}

          {pendingImageData && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={pendingImageData} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setPendingImageData(null)} className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80"><X className="w-3 h-3" /></button>
              </div>
              <span className="text-xs text-muted-foreground">Image ready</span>
            </motion.div>
          )}

          {pendingFileData && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{pendingFileData.name}</span>
                <button onClick={() => setPendingFileData(null)} className="p-0.5 rounded-full hover:bg-background/50"><X className="w-3 h-3" /></button>
              </div>
            </motion.div>
          )}

          <div className="relative bg-secondary rounded-2xl overflow-visible">
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Ask AquaLibriaAI ${modelDisplayName}`} rows={1} className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none p-4 pb-14 max-h-[200px]" />

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 pt-0">
              <div className="flex items-center gap-1">
                {/* Plus menu */}
                <div className="relative">
                  <button onClick={() => setShowPlusMenu(!showPlusMenu)} disabled={isUploadingImage} className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-50">
                    {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Plus className={`w-5 h-5 text-muted-foreground transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />}
                  </button>
                  <AnimatePresence>
                    {showPlusMenu && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55]" onClick={() => setShowPlusMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-xl shadow-elevated z-[60]"
                        >
                          <div className="py-1">
                            <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-foreground">
                              <Camera className="w-4 h-4 shrink-0" /><span className="text-sm">Camera / Image</span>
                            </button>
                            <button onClick={() => { docInputRef.current?.click(); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-foreground">
                              <FileText className="w-4 h-4 shrink-0" /><span className="text-sm">Upload file</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Camera shortcut */}
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-accent transition-colors">
                  <LucideImage className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Model selector */}
                <div className="relative">
                  <button onClick={() => setShowModelSelector(!showModelSelector)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-accent transition-colors">
                    <span className="text-xs font-medium text-muted-foreground">{modelDisplayName}</span>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showModelSelector && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55]" onClick={() => setShowModelSelector(false)} />
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-elevated z-[60] overflow-hidden">
                          {SUBSCRIPTION_PLANS.map((plan) => {
                            const modelKey = plan.model as "aqualibriav1" | "aqualibriav2" | "aqualibriav3";
                            const isActive = selectedModel === modelKey;
                            let modelAccess = { allowed: true, remaining: 999 };
                            let limitText = "";
                            if (subscription.plan === "junior" && modelKey !== "aqualibriav1") {
                              modelAccess = canUseModel(modelKey);
                              const usage = getModelUsage();
                              limitText = modelKey === "aqualibriav2" ? `(${90 - usage.v2Count}/90 per 2 hari)` : `(${45 - usage.v3Count}/45 per 2 hari)`;
                            }
                            return (
                              <button key={plan.id} onClick={() => { if (modelAccess.allowed) { setSelectedModel(modelKey); setShowModelSelector(false); } else { toast({ title: "Limit Tercapai", description: `Batas ${plan.modelDisplay} tercapai.`, variant: "destructive" }); } }} className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${!modelAccess.allowed ? "opacity-50" : "hover:bg-accent"} ${isActive ? "bg-accent" : ""}`}>
                                <div className="flex flex-col">
                                  <span className="text-sm text-foreground font-medium">{plan.modelDisplay}</span>
                                  {limitText && <span className="text-xs text-muted-foreground">{limitText}</span>}
                                </div>
                                {isActive && <span className="w-2 h-2 rounded-full bg-green-500" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mic */}
                {isListening ? (
                  <button onClick={stopListening} className="p-2 rounded-full bg-destructive text-destructive-foreground animate-pulse"><MicOff className="w-5 h-5" /></button>
                ) : (
                  <button onClick={inputValue.trim() || pendingImageData || pendingFileData ? handleSendMessage : startListening} disabled={isLoading} className={`p-2 rounded-full transition-all disabled:opacity-40 ${inputValue.trim() || pendingImageData || pendingFileData ? "bg-foreground text-background" : "hover:bg-accent"}`}>
                    {inputValue.trim() || pendingImageData || pendingFileData ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
                  </button>
                )}
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
      <ArchivedChatsModal isOpen={showArchivedChats} onClose={() => setShowArchivedChats(false)} sessions={chatHistory} archivedIds={chatManagement.archivedSessions} onRestoreSession={handleArchiveSession} onDeleteSession={handleDeleteSession} onSelectSession={handleSelectSession} />

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
