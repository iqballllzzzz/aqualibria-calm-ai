import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Menu, X, Search, Sparkles, Music, Quote,
  MessageSquare, ChevronDown, Loader2, Mic, MicOff, AudioLines, Leaf, Crown, User, ImageIcon,
  MoreVertical, Pin, Archive, Edit2, Share2, Trash2, Check,
  Camera, FileText, Youtube, Image as LucideImage, Settings, Code, Zap, Phone, GraduationCap,
  Bot, Layout, Palette, Presentation, ChevronRight, Wand2, FolderTree, History, Clock, PenLine, BookOpen, Lightbulb, TerminalSquare,
} from "lucide-react";
import GeneratedImageViewer from "@/components/GeneratedImageViewer";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage, sendResearchQuery, generateImage, generateSlideImage, generateSlideDeck, generateDesignImage, searchSpotify, uploadImage, analyzeImage, analyzeFile, analyzeYouTube, fileToBase64, extractTextFromDocx, extractTextFromFile, isVisionSupportedFile, ChatMessage, generateMessageId, VoiceOption, SUBSCRIPTION_PLANS, getDualAgentPerspectives, editImageLatentLeaf, streamChatMessage, consumeCredit, fetchCreditStatus, CreditsRow, generateFullstackCode, fetchCreditUsageLogs, CreditUsageLog } from "@/lib/api";
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
import TypingAnimation from "@/components/TypingAnimation";
import SmartThinkingIndicator, { classifyMessageComplexity } from "@/components/SmartThinkingIndicator";
import ResearchIndicator from "@/components/ResearchIndicator";
import DualAgentView from "@/components/DualAgentView";
import ImageGalleryModal from "@/components/ImageGalleryModal";
import ArchivedChatsModal from "@/components/ArchivedChatsModal";
import AgentPanel, { AgentMode } from "@/components/AgentPanel";
import SlideDeckViewer from "@/components/SlideDeckViewer";
import AgentWorkspace, { parseFilesFromResponse } from "@/components/agent/AgentWorkspace";
import ThinkingBlock from "@/components/agent/ThinkingBlock";
import { ProjectFile } from "@/components/agent/FileExplorer";
import { supabase } from "@/integrations/supabase/client";
import { useCloudSync } from "@/hooks/useCloudSync";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

const GREETINGS: Record<string, string> = {
  en: "What's on your mind?",
  id: "Ada yang bisa dibantu?",
  ko: "무엇을 도와드릴까요?",
  ja: "何をお手伝いしましょうか？",
  fr: "Comment puis-je aider ?",
  es: "¿En qué puedo ayudarte?",
  de: "Wie kann ich Ihnen helfen?",
  zh: "有什么我可以帮您的？",
  ar: "كيف يمكنني مساعدتك؟",
  hi: "मैं आपकी कैसे मदद कर सकता हूं?",
  ru: "Чем я могу помочь?",
  pt: "Como posso ajudar?",
  tr: "Size nasıl yardımcı olabilirim?",
  vi: "Tôi có thể giúp gì?",
  th: "ฉันช่วยอะไรได้บ้าง?",
};

const QUICK_ACTIONS = [
  { icon: Leaf, label: "LatentLeaf", helper: "Edit visual", action: "latentleaf" },
  { icon: PenLine, label: "Tulis", helper: "Draft cepat", action: "write" },
  { icon: BookOpen, label: "Belajar", helper: "Tutor ringkas", action: "learn" },
  { icon: TerminalSquare, label: "Fullstack", helper: "Kode + preview", action: "fullstack" },
];

const formatResetCountdown = (resetAt?: string) => {
  if (!resetAt) return "--:--";
  const resetTime = new Date(resetAt).getTime() + 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, resetTime - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${hours}j ${minutes.toString().padStart(2, "0")}m`;
};

const Chat: React.FC = () => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
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
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingFileData, setPendingFileData] = useState<{ data: string; name: string; type: string; textContent?: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(() => {
    const saved = localStorage.getItem("aqua-selected-voice");
    return (saved && ["aurora","river","luna","ember","atlas","iris","nova","onyx"].includes(saved)) ? saved as VoiceOption : "aurora";
  });
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<"aqualibriav1" | "aqualibriav2" | "aqualibriav3">("aqualibriav1");
  const [showPromoCard, setShowPromoCard] = useState(true);
  const [randomGreeting, setRandomGreeting] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLatentLeaf, setShowLatentLeaf] = useState(false);
  const [showMusea, setShowMusea] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [editingSidebarId, setEditingSidebarId] = useState<string | null>(null);
  const [editSidebarTitle, setEditSidebarTitle] = useState("");
  const [messageComplexity, setMessageComplexity] = useState<"simple" | "medium" | "complex">("medium");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode | null>(null);
  const [slideCount, setSlideCount] = useState<2 | 3 | 4>(4);
  const [creditsRow, setCreditsRow] = useState<CreditsRow | null>(null);
  const [creditLogs, setCreditLogs] = useState<CreditUsageLog[]>([]);
  const [showCreditAudit, setShowCreditAudit] = useState(false);
  const [resetCountdown, setResetCountdown] = useState("--:--");
  const [deckViewer, setDeckViewer] = useState<{ images: string[]; index: number } | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [openWorkspaces, setOpenWorkspaces] = useState<Record<string, boolean>>({});
  const [savingProject, setSavingProject] = useState<string | null>(null);
  const [chatManagement, setChatManagement] = useState(getChatManagement());
  const subscription = getSubscription();
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscript = useCallback((text: string) => setInputValue(text), []);
  const { isListening, startListening, stopListening, error: voiceError } = useVoiceChat({ onTranscript: handleVoiceTranscript, selectedVoice });
  useCloudSync(user);

  useEffect(() => { if (voiceError) toast({ title: "Voice Error", description: voiceError, variant: "destructive" }); }, [voiceError, toast]);
  useEffect(() => { setRandomGreeting(GREETINGS[language] || GREETINGS.en); }, [language]);

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
  }, [urlSessionId, user?.uid]);

  // Re-load chat history when cloud-sync finishes restoring sessions (no manual reload needed)
  useEffect(() => {
    const handler = () => {
      const fresh = getChatHistory();
      setChatHistory(fresh);
      if (urlSessionId) {
        const session = fresh.find(s => s.id === urlSessionId);
        if (session) setMessages(session.messages);
      }
    };
    window.addEventListener("cloud-sync-restored", handler);
    return () => window.removeEventListener("cloud-sync-restored", handler);
  }, [urlSessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`; }
  }, [inputValue]);

  // Fetch credit status (real-time chip)
  const refreshCredits = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetchCreditStatus(subscription.plan, token);
      if (res.ok && res.credits) setCreditsRow(res.credits);
    } catch {}
  }, [subscription.plan]);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  useEffect(() => {
    const updateCountdown = () => setResetCountdown(formatResetCountdown(creditsRow?.daily_reset_at));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 60_000);
    return () => window.clearInterval(timer);
  }, [creditsRow?.daily_reset_at]);

  const openCreditAudit = useCallback(async () => {
    setShowCreditAudit(true);
    const logs = await fetchCreditUsageLogs();
    if (logs.ok) setCreditLogs(logs.logs);
    else toast({ title: "Gagal memuat audit kredit", description: logs.error, variant: "destructive" });
  }, [toast]);

  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = { id: currentSessionId, title: generateSessionTitle(messages[0].content), messages, createdAt: new Date(), updatedAt: new Date() };
      saveChatSession(session);
      setChatHistory(getChatHistory());
      window.history.replaceState(null, "", `/chat/${currentSessionId}`);
    }
  }, [messages, currentSessionId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    const remaining = 10 - pendingImages.length;
    if (remaining <= 0) { toast({ title: "Maksimal 10 gambar", variant: "destructive" }); return; }
    const filesToProcess = Array.from(files).slice(0, remaining);
    setIsUploadingImage(true);
    try {
      const { uploadToRyzumiCDN } = await import("@/lib/cdn");
      const newUrls: string[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
        const cdnResult = await uploadToRyzumiCDN(file as Blob, file.name);
        if (cdnResult.success && cdnResult.url) {
          newUrls.push(cdnResult.url);
        } else {
          const base64 = await fileToBase64(file);
          newUrls.push(base64);
        }
      }
      setPendingImages(prev => [...prev, ...newUrls]);
      toast({ title: "Ready", description: `${newUrls.length} gambar siap dikirim` });
    }
    catch { toast({ title: "Error", description: "Failed to process file", variant: "destructive" }); }
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      toast({ title: "Error", description: "Please select a PDF, DOC, DOCX, or TXT file", variant: "destructive" }); return;
    }
    try {
      let fileData: string | undefined;
      let fileTextContent: string | undefined;
      if (isVisionSupportedFile(file.type)) {
        fileData = await fileToBase64(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        fileTextContent = await extractTextFromDocx(file);
      } else {
        fileTextContent = await extractTextFromFile(file);
      }
      setPendingFileData({ data: fileData || "", name: file.name, type: file.type, textContent: fileTextContent });
      toast({ title: "File ready", description: `${file.name} loaded` });
    }
    catch { toast({ title: "Error", description: "Failed to process file", variant: "destructive" }); }
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const extractYouTubeUrl = (text: string): string | null => {
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/;
    const match = text.match(ytRegex);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
  };

  // Persist base64 image to Ryzumi CDN so it survives reload
  const persistImageToStorage = async (imageUrl: string): Promise<string> => {
    if (!imageUrl.startsWith("data:")) return imageUrl; // Already a URL
    try {
      const { persistImageToCDN } = await import("@/lib/cdn");
      return await persistImageToCDN(imageUrl);
    } catch (e) {
      console.error("Failed to persist image:", e);
      return imageUrl;
    }
  };

  // Handle image editing from the viewer
  const handleEditImageFromViewer = async (imgUrl: string, prompt: string) => {
    setIsLoading(true);
    try {
      const editResult = await editImageLatentLeaf(prompt, imgUrl);
      if (editResult.success && editResult.editedImageUrl) {
        const persistedUrl = await persistImageToStorage(editResult.editedImageUrl);
        setMessages((prev) => [...prev, 
          { role: "user", content: `Edit image: ${prompt}`, timestamp: new Date(), id: generateMessageId() },
          { role: "assistant", content: "Here's the edited image:", timestamp: new Date(), id: generateMessageId(), imageUrl: persistedUrl }
        ]);
        setShowImageViewer(persistedUrl);
      } else {
        toast({ title: "Edit gagal", description: editResult.error || "Failed to edit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to edit image", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && pendingImages.length === 0 && !pendingFileData) || isLoading) return;
    const usage = canUseFeature();
    if (!usage.allowed) { toast({ title: "Limit Tercapai", description: "Upgrade plan untuk lebih banyak!", variant: "destructive" }); setShowUpgradeModal(true); return; }
    const messageText = inputValue.trim() || (pendingImages.length > 0 ? "Apa yang ada di gambar ini?" : "Analisis file ini");
    setMessageComplexity(classifyMessageComplexity(messageText));
    const firstImage = pendingImages.length > 0 ? pendingImages[0] : undefined;
    const allImageUrls = pendingImages.length > 0 ? [...pendingImages] : undefined;
    const userMessage: ChatMessage = { role: "user", content: messageText, timestamp: new Date(), id: generateMessageId(), imageUrl: firstImage, imageUrls: allImageUrls, fileData: pendingFileData?.data, fileName: pendingFileData?.name, fileType: pendingFileData?.type };
    extractMemoryFromMessage(messageText);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const imagesToAnalyze = [...pendingImages];
    const fileToAnalyze = pendingFileData;
    const youtubeUrl = extractYouTubeUrl(messageText);
    setPendingImages([]);
    setPendingFileData(null);
    setIsLoading(true);
    incrementUsage();
    if (user) { logActivity(user.uid, `chat_${activeMode}`, { model: selectedModel, hasImage: imagesToAnalyze.length > 0, hasFile: !!fileToAnalyze, hasYoutube: !!youtubeUrl }, user.email || undefined, user.displayName || undefined); }
    try {
      let result;
      const memoryContext = buildMemoryContext();
      const conversationHistory = messages.slice(-20).map(m => ({ role: m.role, content: m.content, ...(m.imageUrl && m.role === "user" ? { imageData: m.imageUrl } : {}), ...(m.fileData && m.role === "user" ? { fileData: m.fileData } : {}) }));

      // ===== AGENT MODE: SLIDES (generate slide images) =====
      if (agentMode === "slides") {
        // Image-only deck (2-4 connected slides). No text output, no prompt commentary.
        const wantedCount: 2 | 3 | 4 = slideCount;
        // Credit gate: kind=slides (daily quota first, monthly fallback). Free 8/day.
        {
          const sess = await supabase.auth.getSession();
          const token = sess.data.session?.access_token;
          if (token) {
            const credit = await consumeCredit("slides", wantedCount, subscription.plan, token);
            if (!credit.ok) {
              const isCreditOut = credit.reason === "insufficient_credits" || !credit.error;
              toast({
                title: isCreditOut ? "Kuota AI Slides habis" : "Gagal cek kredit",
                description: isCreditOut ? "Kuota harian habis. Upgrade untuk lanjut." : (credit.error || ""),
                variant: "destructive",
              });
              if (isCreditOut) setShowUpgradeModal(true);
              setIsLoading(false);
              return;
            }
            if (credit.credits) setCreditsRow(credit.credits);
          }
        }
        const deck = await generateSlideDeck(messageText, wantedCount);
        if (deck.success && deck.slides && deck.slides.some(s => s.imageUrl)) {
          const urls = await Promise.all(
            deck.slides
              .filter(s => s.imageUrl)
              .map(s => persistImageToStorage(s.imageUrl as string))
          );
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            id: generateMessageId(),
            imageUrls: urls,
          }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: deck.error || "Gagal membuat slide deck.", timestamp: new Date(), id: generateMessageId() }]);
        }
        setIsLoading(false); return;
      }

      // ===== AGENT MODE: DESIGN (generate design images) =====
      if (agentMode === "design") {
        // Credit gate: kind=designer — Free 20/day. Daily-first, monthly fallback.
        {
          const sess = await supabase.auth.getSession();
          const token = sess.data.session?.access_token;
          if (token) {
            const credit = await consumeCredit("designer", 1, subscription.plan, token);
            if (!credit.ok) {
              const isCreditOut = credit.reason === "insufficient_credits" || !credit.error;
              toast({
                title: isCreditOut ? "Kuota Designer habis" : "Gagal cek kredit",
                description: isCreditOut ? "Kuota harian habis. Upgrade untuk lanjut." : (credit.error || ""),
                variant: "destructive",
              });
              if (isCreditOut) setShowUpgradeModal(true);
              setIsLoading(false);
              return;
            }
            if (credit.credits) setCreditsRow(credit.credits);
          }
        }
        const designResult = await generateDesignImage(messageText);
        if (designResult?.success && designResult?.imageUrl) {
          const persistedUrl = await persistImageToStorage(designResult.imageUrl);
          setMessages((prev) => [...prev, { role: "assistant", content: designResult.response || "Here's your design:", timestamp: new Date(), id: generateMessageId(), imageUrl: persistedUrl }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: designResult?.response || designResult?.error || "Failed to generate design", timestamp: new Date(), id: generateMessageId() }]);
        }
        setIsLoading(false); return;
      }

      // ===== AGENT MODE: FULLSTACK (LlamaCoder) =====
      if (agentMode === "fullstack") {
        {
          const sess = await supabase.auth.getSession();
          const token = sess.data.session?.access_token;
          if (token) {
            const credit = await consumeCredit("fullstack", 1, subscription.plan, token);
            if (!credit.ok) {
              const isCreditOut = credit.reason === "insufficient_credits" || !credit.error;
              toast({
                title: isCreditOut ? "Kuota Fullstack habis" : "Gagal cek kredit",
                description: isCreditOut ? "Kuota harian habis. Upgrade untuk lanjut." : (credit.error || ""),
                variant: "destructive",
              });
              if (isCreditOut) setShowUpgradeModal(true);
              setIsLoading(false);
              return;
            }
            if (credit.credits) setCreditsRow(credit.credits);
          } else {
            toast({ title: "Login diperlukan", description: "Masuk dulu untuk memakai Fullstack AI.", variant: "destructive" });
            setIsLoading(false);
            return;
          }
          const assistantId = generateMessageId();
          setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date(), id: assistantId, isStreaming: true }]);
          const fc = await generateFullstackCode(messageText, token, subscription.plan, "qwen3-coder", "high");
          if (fc.success && fc.code) {
            const chunks = fc.code.match(/[\s\S]{1,48}/g) || [fc.code];
            let typed = "";
            for (const chunk of chunks) {
              typed += chunk;
              setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: typed } : m));
              await new Promise((resolve) => window.setTimeout(resolve, 8));
            }
            setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
          } else {
            const rateText = fc.status === 429 && fc.retryAfterSeconds ? ` Coba lagi dalam ${fc.retryAfterSeconds} detik.` : "";
            setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: `Fullstack AI gagal: ${fc.error || "request gagal"}.${rateText}`, isStreaming: false } : m));
          }
        }
        setIsLoading(false); return;
      }

      // Auto-detect image generation request
      const imageGenPatterns = /^(buatkan?\s*(gambar|image|foto|picture|ilustrasi)|generate\s*(an?\s*)?(image|picture|photo|illustration)|create\s*(an?\s*)?(image|picture|photo)|draw\s|gambarin\s|bikin\s*gambar|buat\s*gambar)/i;
      const isImageRequest = activeMode === "image" || (imagesToAnalyze.length === 0 && !fileToAnalyze && !youtubeUrl && imageGenPatterns.test(messageText));

      // Auto-detect image editing request
      const imageEditPatterns = /^(edit\s*(gambar|image|foto)|ubah\s*(gambar|image|foto)|modif|change\s*(the\s*)?(image|picture|photo)|make\s*(it|the\s*image)|jadikan|rubah|ganti\s*(background|warna|style))/i;
      const lastGeneratedImage = [...messages].reverse().find(m => m.role === "assistant" && m.imageUrl && m.imageUrl !== "[image]");
      const isEditRequest = imagesToAnalyze.length === 0 && !fileToAnalyze && !youtubeUrl && imageEditPatterns.test(messageText) && lastGeneratedImage?.imageUrl;

      if (isEditRequest && lastGeneratedImage?.imageUrl) {
        const editResult = await editImageLatentLeaf(messageText, lastGeneratedImage.imageUrl);
        if (editResult.success && editResult.editedImageUrl) {
          const persistedUrl = await persistImageToStorage(editResult.editedImageUrl);
          setMessages((prev) => [...prev, { role: "assistant", content: "Here's the edited image:", timestamp: new Date(), id: generateMessageId(), imageUrl: persistedUrl }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: editResult.error || "Failed to edit image.", timestamp: new Date(), id: generateMessageId() }]);
        }
        setIsLoading(false); setActiveMode("chat"); return;
      }

      if (isImageRequest) {
        result = await generateImage(messageText);
        if (result?.success && result?.imageUrl) {
          const persistedUrl = await persistImageToStorage(result.imageUrl);
          setMessages((prev) => [...prev, { role: "assistant", content: result.response || "Here's your generated image:", timestamp: new Date(), id: generateMessageId(), imageUrl: persistedUrl }]);
          setIsLoading(false); setActiveMode("chat"); return;
        } else if (result?.success && result?.response) {
          setMessages((prev) => [...prev, { role: "assistant", content: result.response, timestamp: new Date(), id: generateMessageId() }]);
          setIsLoading(false); setActiveMode("chat"); return;
        }
      }

      switch (activeMode) {
        case "research":
          result = await sendChatMessage(messageText, currentSessionId, { isResearchMode: true, model: selectedModel, memoryContext, conversationHistory });
          break;
        case "spotify":
          const spotifyResult = await searchSpotify(messageText);
          if (spotifyResult.success) {
            const resultText = spotifyResult.results?.slice(0, 5).map((track: any, i: number) => `${i + 1}. **${track.name || track.title}** - ${track.artist || track.artists?.join(", ")}`).join("\n") || "No results found.";
            result = { success: true, response: `**Spotify search results:**\n\n${resultText}` };
          } else result = spotifyResult;
          break;
        default: {
          // Use streaming for default chat & fullstack agent
          const promptType = agentMode === "fullstack" ? "fullstack" : "default";
          const assistantId = generateMessageId();
          setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date(), id: assistantId, isStreaming: true, reasoning: "" }]);
          
          await streamChatMessage({
            messages: [...conversationHistory, { role: "user", content: messageText, ...(imagesToAnalyze.length > 0 ? { imageData: imagesToAnalyze[0] } : {}), ...(fileToAnalyze?.data ? { fileData: fileToAnalyze.data } : {}) }],
            promptType,
            model: selectedModel,
            memoryContext,
            youtubeUrl: youtubeUrl || undefined,
            onDelta: (text) => {
              setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m));
            },
            onReasoning: (text) => {
              setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, reasoning: (m.reasoning || "") + text } : m));
            },
            onDone: () => {
              setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
            },
            onError: (error) => {
              toast({ title: "Error", description: error, variant: "destructive" });
              setMessages((prev) => prev.filter(m => m.id !== assistantId));
            },
          });
          if (subscription.plan === "junior" && selectedModel !== "aqualibriav1") incrementModelUsage(selectedModel);
          setIsLoading(false); setActiveMode("chat"); return;
        }
      }
    } catch { toast({ title: "Error", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsLoading(false); setActiveMode("chat"); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  // Edit message: update user message and remove all subsequent messages, then re-send
  const handleEditMessage = async (messageId: string, newText: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1 || !newText.trim()) return;
    
    // Keep messages before this one, update this one
    const updatedMessages = messages.slice(0, msgIndex);
    const editedMsg: ChatMessage = { ...messages[msgIndex], content: newText.trim() };
    updatedMessages.push(editedMsg);
    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditingMessageText("");
    
    // Re-send the edited message
    setMessageComplexity(classifyMessageComplexity(newText));
    setIsLoading(true);
    incrementUsage();
    try {
      const memoryContext = buildMemoryContext();
      const conversationHistory = updatedMessages.slice(0, -1).slice(-20).map(m => ({ role: m.role, content: m.content }));
      const result = await sendChatMessage(newText.trim(), currentSessionId, { model: selectedModel, memoryContext, conversationHistory });
      if (result?.success && result?.response) {
        setMessages(prev => [...prev, { role: "assistant", content: result.response!, timestamp: new Date(), id: generateMessageId() }]);
      } else {
        toast({ title: "Error", description: result?.error || "Failed to get response", variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };
  const handleNewChat = () => { const newId = generateSessionId(); setMessages([]); setCurrentSessionId(newId); setShowHistory(false); setShowSidebar(false); navigate(`/chat/${newId}`); };
  const handleSelectSession = (session: ChatSession) => { setMessages(session.messages); setCurrentSessionId(session.id); setShowHistory(false); setShowSidebar(false); navigate(`/chat/${session.id}`); };
  const handleDeleteSession = (id: string) => { deleteChatSession(id); setChatHistory(getChatHistory()); setChatManagement(getChatManagement()); if (currentSessionId === id) handleNewChat(); };
  const handlePinSession = (id: string) => { togglePinSession(id); setChatManagement(getChatManagement()); };
  const handleArchiveSession = (id: string) => { toggleArchiveSession(id); setChatManagement(getChatManagement()); setChatHistory(getChatHistory()); };
  const handleRenameSession = (id: string, newTitle: string) => { renameSession(id, newTitle); setChatHistory(getChatHistory()); };
  const handleShareSession = async (session: ChatSession) => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/share-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "create", sessionId: session.id, title: session.title, messages: session.messages, sharedByName: user?.displayName || "Anonymous" }),
      });
      const data = await response.json();
      if (data.success && data.shareId) {
        const shareUrl = `${window.location.origin}/shared/${data.shareId}`;
        if (navigator.share) { try { await navigator.share({ title: `AquaLibriaAI: ${session.title}`, url: shareUrl }); return; } catch {} }
        try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link disalin!", description: "Link chat bisa dibagikan ke siapa saja" }); } catch { toast({ title: "Gagal menyalin", variant: "destructive" }); }
      } else {
        toast({ title: "Gagal membagikan", description: data.error || "Coba lagi nanti", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Gagal membagikan chat", variant: "destructive" });
    }
  };
  const handleStartSidebarRename = (session: ChatSession) => { setEditingSidebarId(session.id); setEditSidebarTitle(session.title); };
  const handleConfirmSidebarRename = () => { if (editingSidebarId && editSidebarTitle.trim()) handleRenameSession(editingSidebarId, editSidebarTitle.trim()); setEditingSidebarId(null); setEditSidebarTitle(""); };
  const handleQuoteGenerate = (data: QuoteData) => {
    setMessages((prev) => [...prev, { role: "user", content: `Create quote: "${data.text}" - ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }, { role: "assistant", content: `**"${data.text}"**\n\n— ${data.author || "Unknown"}`, timestamp: new Date(), id: generateMessageId() }]);
  };

  // Save agent project to database
  const handleSaveProject = async (messageId: string, files: ProjectFile[], title: string) => {
    if (!user) { toast({ title: "Login required", variant: "destructive" }); return; }
    setSavingProject(messageId);
    try {
      const previewHtml = files.find(f => f.path.endsWith(".html"))?.content || "";
      const { error } = await supabase.from("agent_projects").insert({
        user_id: user.uid,
        title: title || "Untitled Project",
        agent_type: agentMode || "fullstack",
        files: files as any,
        preview_html: previewHtml,
      } as any);
      if (error) throw error;
      toast({ title: "Project saved!" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSavingProject(null);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "latentleaf": setShowLatentLeaf(true); break;
      case "fullstack": setAgentMode("fullstack"); setInputValue("Buatkan aplikasi "); break;
      case "musea": setShowMusea(true); break;
      case "learn": setInputValue("Help me learn something new today"); break;
      case "write": setInputValue("Help me write "); break;
      case "boost": setInputValue("Give me a motivational boost for today!"); break;
    }
  };

  const memory = getAIMemory();
  const userName = memory.userName || user?.displayName?.split(" ")[0] || "User";
  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();
  const userPhotoURL = user?.photoURL;
  const filteredHistory = chatHistory.filter(session => session.title.toLowerCase().includes(historySearchQuery.toLowerCase()));
  const modelDisplayName = selectedModel === "aqualibriav1" ? "V1" : selectedModel === "aqualibriav2" ? "V2" : "V3";

  return (
    <div className="h-screen-safe w-screen overflow-hidden flex flex-col bg-background relative" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="spotlight spotlight-violet" style={{ width: "44vw", height: "44vw", top: "-15%", left: "-15%", opacity: 0.18 }} />
        <div className="spotlight spotlight-cyan" style={{ width: "32vw", height: "32vw", bottom: "-10%", right: "-10%", opacity: 0.14 }} />
        <div className="spotlight spotlight-pink" style={{ width: "26vw", height: "26vw", top: "30%", right: "10%", opacity: 0.10 }} />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleImageUpload} className="hidden" multiple />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv" onChange={handleDocUpload} className="hidden" />

      <ChatHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={chatHistory} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onNewChat={handleNewChat} pinnedSessions={chatManagement.pinnedSessions} archivedSessions={chatManagement.archivedSessions} onPinSession={handlePinSession} onArchiveSession={handleArchiveSession} onRenameSession={handleRenameSession} onShareSession={handleShareSession} />

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 z-40 backdrop-blur-md" onClick={() => setShowSidebar(false)} />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] glass z-50 flex flex-col border-r border-border/50"
            >
              {/* Sidebar header */}
              <div className="p-5 flex items-center gap-3 shrink-0">
                <Logo size="sm" />
                <span className="font-display font-bold text-foreground tracking-tight">AquaLibria</span>
              </div>

              {/* New Chat */}
              <div className="px-4 shrink-0">
                <button onClick={handleNewChat} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:shadow-lg hover:shadow-primary/20">
                  <Plus className="w-4 h-4" /><span>New Chat</span>
                </button>
              </div>

              {/* Nav */}
              <div className="px-4 mt-3 space-y-0.5 shrink-0">
                <button onClick={() => { setShowVoiceCall(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground-secondary text-sm font-medium">
                  <Phone className="w-4 h-4" /><span>Voice Call</span>
                </button>
                <button onClick={() => { setShowImageGallery(true); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground-secondary text-sm font-medium">
                  <ImageIcon className="w-4 h-4" /><span>Gallery</span>
                </button>
                <button onClick={() => { navigate("/coding"); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground-secondary text-sm font-medium">
                  <Code className="w-4 h-4" /><span>Coding Partner</span>
                </button>
                <button onClick={() => { navigate("/projects"); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground-secondary text-sm font-medium">
                  <FolderTree className="w-4 h-4" /><span>My Projects</span>
                </button>
              </div>

              {/* Search */}
              <div className="px-4 mt-4 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
                  <input type="text" placeholder="Search chats..." value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-secondary border border-border rounded-2xl text-foreground text-xs placeholder:text-foreground-muted focus:outline-none focus:border-primary/40 transition-colors" />
                </div>
              </div>

              {/* History */}
              <ScrollArea className="flex-1 px-4 mt-3">
                {isLoadingHistory ? (
                  <div className="space-y-2 py-2">{[...Array(5)].map((_, i) => (<div key={i} className="px-3 py-3"><Skeleton className="h-3.5 w-full rounded-lg" /></div>))}</div>
                ) : filteredHistory.length === 0 ? (
                  <p className="text-center text-foreground-muted py-8 text-xs">No chat history</p>
                ) : (
                  <div className="space-y-0.5 py-1">
                    {filteredHistory.filter(s => !chatManagement.archivedSessions.includes(s.id)).slice(0, 25).map((session) => {
                      const isPinned = chatManagement.pinnedSessions.includes(session.id);
                      const isEditing = editingSidebarId === session.id;
                      return (
                        <div key={session.id} className={`group flex items-center gap-1 rounded-2xl cursor-pointer transition-all ${currentSessionId === session.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                          {/* Chat title area */}
                          <div className="flex-1 min-w-0 px-3.5 py-3" onClick={() => !isEditing && handleSelectSession(session)}>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input type="text" value={editSidebarTitle} onChange={(e) => setEditSidebarTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConfirmSidebarRename()} onClick={(e) => e.stopPropagation()} className="flex-1 text-xs text-foreground bg-background border border-border rounded-xl px-2.5 py-1.5 focus:outline-none" autoFocus />
                                <button onClick={(e) => { e.stopPropagation(); handleConfirmSidebarRename(); }} className="p-1 rounded hover:bg-accent"><Check className="w-3.5 h-3.5 text-success" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {isPinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                                <span className="text-xs text-foreground truncate font-medium">{session.title}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Delete shortcut */}
                          {!isEditing && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                              className="shrink-0 mr-1.5 opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-full hover:bg-destructive/15 transition-all"
                              aria-label="Delete chat"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Sidebar footer */}
              <div className="p-4 border-t border-border/50 shrink-0">
                <button onClick={() => { navigate("/settings"); setShowSidebar(false); }} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-accent transition-colors">
                  {userPhotoURL ? (
                    <img src={userPhotoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" />
                  ) : (
                    <div className="w-8 h-8 rounded-full gradient-aqua flex items-center justify-center text-primary-foreground text-xs font-bold">{userInitial}</div>
                  )}
                  <span className="flex-1 text-left font-medium text-foreground text-sm truncate">{userName}</span>
                  <Settings className="w-4 h-4 text-foreground-muted" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-14 shrink-0 surface-glass flex items-center justify-between px-4 relative z-20 border-b border-border/40">
        <button onClick={() => setShowSidebar(true)} className="p-2.5 -ml-1 rounded-2xl hover:bg-accent/80 transition-colors" aria-label="Open menu">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-display font-bold tracking-tight text-foreground">
            Aqua<span className="text-brand-gradient">libria</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Live credits chip (all plans) */}
          {creditsRow && (
            <button onClick={openCreditAudit} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/60 border border-border text-[10px] font-bold hover:bg-accent transition-colors" title="Audit kredit">
              <span className="flex items-center gap-1 text-foreground" title="Fullstack (daily/monthly)">
                <Code className="w-3 h-3" />
                {(creditsRow.daily_fullstack ?? 0) >= 999999 ? "∞" : `${creditsRow.daily_fullstack ?? 0}+${creditsRow.fullstack_credits >= 999999 ? "∞" : creditsRow.fullstack_credits}`}
              </span>
              <span className="hidden min-[390px]:flex items-center gap-1 text-foreground" title="Slides (daily)">
                <Presentation className="w-3 h-3" />
                {(creditsRow.daily_slides ?? 0) >= 999999 ? "∞" : (creditsRow.daily_slides ?? 0)}
              </span>
              <span className="hidden sm:flex items-center gap-1 text-foreground" title="Designer (daily)">
                <Palette className="w-3 h-3" />
                {(creditsRow.daily_designer ?? 0) >= 999999 ? "∞" : (creditsRow.daily_designer ?? 0)}
              </span>
              {creditsRow.plan !== "nigown" && <span className="hidden sm:flex items-center gap-1 text-foreground-muted"><Clock className="w-3 h-3" />{resetCountdown}</span>}
            </button>
          )}
          {/* Upgrade Plan button */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="p-2 rounded-2xl hover:bg-accent/80 transition-colors relative"
            title="Upgrade Plan"
            aria-label="Upgrade Plan"
          >
            <Crown className="w-5 h-5 text-amber-500" />
            {subscription.plan === "junior" && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button onClick={() => navigate("/settings")} className="overflow-hidden rounded-full ring-2 ring-border hover:ring-primary/40 transition-all" aria-label="Open settings">
            {userPhotoURL ? (
              <img src={userPhotoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">{userInitial}</div>
            )}
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center" style={{ minHeight: 'calc((var(--vh, 1vh) * 100) - 180px)' }}>
              {/* Welcome */}
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground-muted mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AquaLibriaAI Workspace
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight tracking-tight">
                  {randomGreeting}
                </h1>
                <p className="mt-3 text-sm text-foreground-muted leading-relaxed max-w-md">Mulai dari chat, kode fullstack, slide visual, sampai desain — semuanya dari satu input.</p>
              </motion.div>

              {/* Quick Actions — original Aqua command rail */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mb-6 overflow-hidden rounded-3xl border border-border bg-card/80">
                {QUICK_ACTIONS.map((qa, i) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.action}
                      onClick={() => handleQuickAction(qa.action)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/70 transition-colors border-b border-border/50 last:border-b-0"
                    >
                      <span className="w-9 h-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-foreground">{qa.label}</span>
                        <span className="block text-[11px] text-foreground-muted truncate">{qa.helper}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-foreground-muted" />
                    </button>
                  );
                })}
              </motion.div>

              {/* Promo Card */}
              <AnimatePresence>
                {showPromoCard && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border rounded-3xl p-5 flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
                      <Leaf className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-bold">LatentLeaf Image Editor</p>
                      <p className="text-foreground-muted text-xs mt-0.5">AI-powered image editing at your fingertips</p>
                    </div>
                    <button onClick={() => { setShowLatentLeaf(true); dismissPromo(); }} className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold transition-all hover:shadow-md hover:shadow-primary/20 shrink-0">
                      Try it
                    </button>
                    <button onClick={dismissPromo} className="shrink-0 p-1.5 hover:bg-accent rounded-full transition-colors -mr-1">
                      <X className="w-3.5 h-3.5 text-foreground-muted" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message, index) => (
                <motion.div key={message.id || index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] overflow-hidden ${
                    message.role === "user" 
                      ? "bg-chat-user rounded-3xl rounded-br-lg px-4 py-3 border border-primary/10" 
                      : "px-1 py-1"
                  }`}>
                    {/* User attached images - show all */}
                    {message.imageUrls && message.imageUrls.length > 0 && message.role === "user" ? (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {message.imageUrls.map((imgUrl, imgIdx) => (
                          <img key={imgIdx} src={imgUrl} alt={`Uploaded ${imgIdx+1}`} className="rounded-2xl max-h-36 cursor-pointer hover:opacity-90 transition-opacity" style={{ maxWidth: message.imageUrls!.length > 2 ? '45%' : '100%' }} onClick={() => setShowImageViewer(imgUrl)} />
                        ))}
                      </div>
                    ) : message.imageUrl && message.role === "user" && message.imageUrl !== "[image]" ? (
                      <div className="mb-2.5">
                        <img src={message.imageUrl} alt="Uploaded" className="rounded-2xl max-w-full max-h-48 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowImageViewer(message.imageUrl!)} />
                      </div>
                    ) : null}
                    {message.imageUrl === "[image]" && message.role === "user" && (
                      <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-accent/80 border border-border">
                        <LucideImage className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-foreground-muted">Image attached</span>
                      </div>
                    )}
                    {/* User attached file */}
                    {message.fileName && message.role === "user" && (
                      <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-accent/80 border border-border">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-foreground-muted truncate">{message.fileName}</span>
                      </div>
                    )}
                    {/* Content - with edit support for user messages */}
                    {editingMessageId === message.id && message.role === "user" ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="w-full bg-background border border-border rounded-2xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingMessageId(null); setEditingMessageText(""); }} className="px-3 py-1.5 rounded-xl text-xs text-foreground-muted hover:bg-accent transition-colors">Cancel</button>
                          <button onClick={() => handleEditMessage(message.id!, editingMessageText)} className="px-3 py-1.5 rounded-xl text-xs bg-primary text-primary-foreground font-semibold hover:shadow-md transition-all">Save & Resend</button>
                        </div>
                      </div>
                    ) : message.isDualAgent && message.perspectiveA && message.perspectiveB ? (
                      <DualAgentView
                        perspectiveA={message.perspectiveA}
                        perspectiveB={message.perspectiveB}
                        agentAName={message.agentAName || "Optimist"}
                        agentBName={message.agentBName || "Realist"}
                        onSelect={(choice) => {
                          setMessages(prev => prev.map((m, i) => 
                            i === index ? { ...m, selectedPerspective: choice, content: choice === "A" ? message.perspectiveA! : message.perspectiveB! } : m
                          ));
                        }}
                      />
                    ) : message.role === "assistant" ? (
                      (() => {
                        const agentFiles = parseFilesFromResponse(message.content);
                        const hasFiles = agentFiles.length > 0;
                        const cleanContent = hasFiles ? message.content.replace(/---FILE:\s*.+?---\n[\s\S]*?---END FILE---/g, "").replace(/---FILE:\s*.+?---\n[\s\S]*$/g, "").trim() : message.content;
                        const isWsOpen = openWorkspaces[message.id || ""];
                        return (
                          <>
                            {/* Collapsible reasoning/thinking */}
                            {message.reasoning && (
                              <details className="mb-2 text-xs">
                                <summary className="cursor-pointer text-foreground-muted hover:text-foreground transition-colors font-medium py-1">
                                  {message.isStreaming ? "⟳ Thinking..." : "◆ Thought Process"}
                                </summary>
                                <div className="mt-1 pl-3 border-l-2 border-border text-foreground-muted whitespace-pre-wrap text-[11px] leading-relaxed">
                                  {message.reasoning}
                                </div>
                              </details>
                            )}
                            {cleanContent && <MarkdownRenderer content={cleanContent} />}
                            {message.isStreaming && !message.content && (
                              <span className="inline-block w-2 h-4 bg-foreground/40 animate-pulse rounded-sm" />
                            )}
                            {/* Agent workspace for fullstack files */}
                            {hasFiles && (
                              <>
                                {!isWsOpen && !message.isStreaming ? (
                                  <button
                                    onClick={() => setOpenWorkspaces(prev => ({ ...prev, [message.id || ""]: true }))}
                                    className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/15 transition-colors"
                                  >
                                    <Code className="w-3.5 h-3.5" />
                                    View Project ({agentFiles.length} files)
                                  </button>
                                ) : (
                                  <AgentWorkspace
                                    files={agentFiles}
                                    projectTitle={messages.find(m => m.role === "user")?.content.slice(0, 40) || "Project"}
                                    onClose={() => setOpenWorkspaces(prev => ({ ...prev, [message.id || ""]: false }))}
                                    onSave={() => handleSaveProject(message.id || "", agentFiles, messages.find(m => m.role === "user")?.content.slice(0, 40) || "Project")}
                                    isSaving={savingProject === message.id}
                                    isStreaming={message.isStreaming}
                                  />
                                )}
                              </>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed break-words text-sm text-foreground" style={{ overflowWrap: 'anywhere' }}>{message.content}</p>
                    )}
                    {/* AI generated image */}
                    {message.imageUrls && message.imageUrls.length > 0 && message.role === "assistant" ? (
                      <div className={`mt-3 grid gap-2 ${message.imageUrls.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {message.imageUrls.map((u, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={u}
                              alt={`Slide ${i + 1}`}
                              className="rounded-2xl w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity border border-border"
                              onClick={() => setDeckViewer({ images: message.imageUrls!, index: i })}
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[10px] font-bold text-foreground border border-border">
                              {i + 1}/{message.imageUrls!.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : message.imageUrl && message.role === "assistant" && message.imageUrl !== "[image]" ? (
                      <div className="mt-3"><img src={message.imageUrl} alt="Generated" className="rounded-2xl max-w-full cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowImageViewer(message.imageUrl!)} /></div>
                    ) : null}
                    <div className="mt-2 flex justify-end">
                      <MessageControls 
                        messageId={message.id || `${index}`} 
                        sessionId={currentSessionId} 
                        content={message.content} 
                        isAssistant={message.role === "assistant"} 
                        selectedVoice={selectedVoice}
                        onEdit={message.role === "user" && !editingMessageId ? () => { setEditingMessageId(message.id!); setEditingMessageText(message.content); } : undefined}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              {/* Smart Loading indicator */}
              {activeMode === "research" ? (
                <ResearchIndicator isLoading={isLoading} />
              ) : (
                <SmartThinkingIndicator isLoading={isLoading} messageComplexity={messageComplexity} />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="shrink-0 px-4 pb-safe relative z-10" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          {/* Active mode indicator */}
          {activeMode !== "chat" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <span className="text-[10px] text-primary font-bold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">{activeMode === "research" ? "Research" : activeMode === "image" ? "Image" : "Spotify"}</span>
              <button onClick={() => setActiveMode("chat")} className="text-[10px] text-foreground-muted hover:text-foreground transition-colors">Cancel</button>
            </motion.div>
          )}
          {agentMode && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2">
              <span className="text-[10px] text-primary font-bold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                Agent: {agentMode === "slides" ? "AI Slides" : agentMode === "fullstack" ? "Full-Stack" : "Design"}
              </span>
              <button onClick={() => setAgentMode(null)} className="text-[10px] text-foreground-muted hover:text-foreground transition-colors">Deactivate</button>
            </motion.div>
          )}

          {/* Pending attachments */}
          {pendingImages.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2 flex-wrap">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative w-14 h-14 rounded-2xl overflow-hidden border border-border shadow-sm">
                  <img src={img} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 hover:bg-background"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {pendingImages.length < 10 && (
                <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center hover:bg-accent/50 transition-colors">
                  <Plus className="w-5 h-5 text-foreground-muted" />
                </button>
              )}
              <span className="text-[10px] text-foreground-muted">{pendingImages.length}/10</span>
            </motion.div>
          )}
          {pendingFileData && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-accent border border-border">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-foreground-muted truncate max-w-[180px]">{pendingFileData.name}</span>
                <button onClick={() => setPendingFileData(null)} className="p-0.5 rounded-full hover:bg-background/50"><X className="w-3 h-3" /></button>
              </div>
            </motion.div>
          )}

          {/* Input box */}
          <div className="relative bg-card border border-border rounded-3xl overflow-visible shadow-md input-glow transition-all">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message AquaLibria ${modelDisplayName}...`}
              rows={1}
              className="w-full bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none px-5 pt-4 pb-14 max-h-[200px] text-sm"
            />

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-0.5">
                {/* Plus menu */}
                <div className="relative">
                  <button onClick={() => setShowPlusMenu(!showPlusMenu)} disabled={isUploadingImage} className="p-2.5 rounded-2xl hover:bg-accent transition-colors disabled:opacity-50">
                    {isUploadingImage ? <Loader2 className="w-[18px] h-[18px] animate-spin text-foreground-muted" /> : <Plus className={`w-[18px] h-[18px] text-foreground-muted transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />}
                  </button>
                  <AnimatePresence>
                    {showPlusMenu && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55]" onClick={() => setShowPlusMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-3xl shadow-elevated z-[60] overflow-hidden p-1.5"
                        >
                          <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground text-sm">
                            <Camera className="w-4 h-4 text-foreground-muted" /><span>Camera / Image</span>
                          </button>
                          <button onClick={() => { docInputRef.current?.click(); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground text-sm">
                            <FileText className="w-4 h-4 text-foreground-muted" /><span>Upload File</span>
                          </button>
                          <button onClick={() => { setShowVoiceCall(true); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground text-sm">
                            <Phone className="w-4 h-4 text-foreground-muted" /><span>Voice Call</span>
                          </button>
                          <button onClick={() => { setShowLatentLeaf(true); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground text-sm">
                            <Leaf className="w-4 h-4 text-primary" /><span>LatentLeaf Edit</span>
                          </button>
                          <button onClick={() => { navigate("/study/chat"); setShowPlusMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-accent transition-colors text-foreground text-sm">
                            <GraduationCap className="w-4 h-4 text-amber-500" /><span>Pembelajaran</span>
                            <span className="ml-auto text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">NEW</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Image shortcut */}
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-2xl hover:bg-accent transition-colors">
                  <LucideImage className="w-[18px] h-[18px] text-foreground-muted" />
                </button>
              </div>

              <div className="flex items-center gap-0.5">
                {/* Agent button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAgentPanel(!showAgentPanel)}
                    className={`flex items-center gap-1 px-2.5 py-2 rounded-2xl transition-colors ${agentMode ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                  >
                    <Bot className={`w-4 h-4 ${agentMode ? "text-primary" : "text-foreground-muted"}`} />
                    {agentMode && <span className="text-[10px] font-bold text-primary">{agentMode === "slides" ? "Slides" : agentMode === "fullstack" ? "Code" : "Design"}</span>}
                  </button>
                  <AgentPanel
                    isOpen={showAgentPanel}
                    onClose={() => setShowAgentPanel(false)}
                    onSelectMode={(mode) => setAgentMode(agentMode === mode ? null : mode)}
                    activeMode={agentMode}
                    slideCount={slideCount}
                    onSlideCountChange={setSlideCount}
                  />
                </div>

                {/* Model selector */}
                <div className="relative">
                  <button onClick={() => setShowModelSelector(!showModelSelector)} className="flex items-center gap-1 px-3 py-2 rounded-2xl hover:bg-accent transition-colors">
                    <span className="text-[11px] font-bold text-foreground-muted">{modelDisplayName}</span>
                    <ChevronDown className={`w-3 h-3 text-foreground-muted transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showModelSelector && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55]" onClick={() => setShowModelSelector(false)} />
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-3xl shadow-elevated z-[60] overflow-hidden p-1.5">
                          {SUBSCRIPTION_PLANS.map((plan) => {
                            const modelKey = plan.model as "aqualibriav1" | "aqualibriav2" | "aqualibriav3";
                            const isActive = selectedModel === modelKey;
                            let modelAccess = { allowed: true, remaining: 999 };
                            let limitText = "";
                            if (subscription.plan === "junior" && modelKey !== "aqualibriav1") {
                              modelAccess = canUseModel(modelKey);
                              const usage = getModelUsage();
                              limitText = modelKey === "aqualibriav2" ? `(${90 - usage.v2Count}/90)` : `(${45 - usage.v3Count}/45)`;
                            }
                            return (
                              <button key={plan.id} onClick={() => { if (modelAccess.allowed) { setSelectedModel(modelKey); setShowModelSelector(false); } else { toast({ title: "Limit Tercapai", variant: "destructive" }); } }} className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between rounded-2xl ${!modelAccess.allowed ? "opacity-40" : "hover:bg-accent"} ${isActive ? "bg-accent" : ""}`}>
                                <div>
                                  <span className="text-sm text-foreground font-semibold">{plan.modelDisplay}</span>
                                  {limitText && <span className="text-[10px] text-foreground-muted ml-1.5">{limitText}</span>}
                                </div>
                                {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mic / Send */}
                {isListening ? (
                  <button onClick={stopListening} className="p-2.5 rounded-2xl bg-destructive text-destructive-foreground animate-pulse"><MicOff className="w-[18px] h-[18px]" /></button>
                ) : (
                  <button onClick={inputValue.trim() || pendingImages.length > 0 || pendingFileData ? handleSendMessage : startListening} disabled={isLoading} className={`p-2.5 rounded-2xl transition-all disabled:opacity-40 ${inputValue.trim() || pendingImages.length > 0 || pendingFileData ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-accent"}`}>
                    {inputValue.trim() || pendingImages.length > 0 || pendingFileData ? <Send className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px] text-foreground-muted" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreditAudit && (
          <motion.div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-lg max-h-[80dvh] bg-popover border border-border rounded-3xl shadow-elevated overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Riwayat kredit</p>
                    {creditsRow?.plan !== "nigown" && <p className="text-[11px] text-foreground-muted">Reset harian dalam {resetCountdown}</p>}
                  </div>
                </div>
                <button onClick={() => setShowCreditAudit(false)} className="p-2 rounded-2xl hover:bg-accent transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <ScrollArea className="max-h-[62dvh]">
                <div className="p-3 space-y-2">
                  {creditLogs.length === 0 ? (
                    <div className="py-10 text-center text-sm text-foreground-muted">Belum ada konsumsi kredit.</div>
                  ) : creditLogs.map((log) => {
                    const Icon = log.kind === "fullstack" ? Code : log.kind === "slides" ? Presentation : Palette;
                    return (
                      <div key={log.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
                        <span className="w-9 h-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-foreground" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold capitalize text-foreground">{log.kind}</p>
                          <p className="text-[11px] text-foreground-muted">{new Date(log.created_at).toLocaleString("id-ID")} · {log.source}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">-{log.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QuoteMaker isOpen={showQuoteMaker} onClose={() => setShowQuoteMaker(false)} onGenerate={handleQuoteGenerate} />
      <VoiceCallModal isOpen={showVoiceCall} onClose={(voiceMessages) => { setShowVoiceCall(false); if (voiceMessages?.length > 0) setMessages((prev) => [...prev, ...voiceMessages]); }} selectedVoice={selectedVoice} onSelectVoice={(v) => { setSelectedVoice(v); localStorage.setItem("aqua-selected-voice", v); }} sessionId={currentSessionId} />
      <UpgradePlanModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      {deckViewer && (
        <SlideDeckViewer
          images={deckViewer.images}
          initialIndex={deckViewer.index}
          onClose={() => setDeckViewer(null)}
        />
      )}
      <LatentLeafModal isOpen={showLatentLeaf} onClose={() => setShowLatentLeaf(false)} />
      <MuseaModal isOpen={showMusea} onClose={() => setShowMusea(false)} />
      <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} />
      <ArchivedChatsModal isOpen={showArchivedChats} onClose={() => setShowArchivedChats(false)} sessions={chatHistory} archivedIds={chatManagement.archivedSessions} onRestoreSession={handleArchiveSession} onDeleteSession={handleDeleteSession} onSelectSession={handleSelectSession} />

      {/* Image Viewer with full actions */}
      <GeneratedImageViewer
        imageUrl={showImageViewer}
        onClose={() => setShowImageViewer(null)}
        onEditImage={handleEditImageFromViewer}
      />
    </div>
  );
};

export default Chat;
