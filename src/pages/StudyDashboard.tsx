import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Youtube, Image as LucideImage, Upload, ArrowLeft,
  BookOpen, Brain, HelpCircle, Layers, RefreshCw, X, Loader2, 
  ChevronDown, ChevronRight, ChevronLeft, Globe, Sparkles, Video,
  Link2, Check, AlertCircle, RotateCcw, Share2, ZoomIn, ZoomOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendChatMessage, fileToBase64, extractTextFromDocx, extractTextFromFile } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Logo from "@/components/Logo";

type StudyMode = "summary" | "mindmap" | "quiz" | "flashcards";
type ToneStyle = "detailed" | "brief" | "storytelling" | "slang";
type MindmapLayout = "radial" | "tree" | "horizontal" | "outline";
type SourceTab = "document" | "image" | "video" | "youtube";

const STUDY_MODES: { id: StudyMode; label: string; icon: React.ReactNode; desc: string; emoji: string }[] = [
  { id: "summary", label: "Ringkasan", icon: <BookOpen className="w-4 h-4" />, desc: "Rangkuman materi", emoji: "📝" },
  { id: "mindmap", label: "Mindmap", icon: <Brain className="w-4 h-4" />, desc: "Peta konsep visual", emoji: "🧠" },
  { id: "quiz", label: "Kuis", icon: <HelpCircle className="w-4 h-4" />, desc: "Uji pemahaman", emoji: "❓" },
  { id: "flashcards", label: "Flashcards", icon: <Layers className="w-4 h-4" />, desc: "Kartu belajar", emoji: "🃏" },
];

const TONE_OPTIONS: { id: ToneStyle; label: string; emoji: string }[] = [
  { id: "detailed", label: "Jelas & Lengkap", emoji: "📖" },
  { id: "brief", label: "Singkat & Penting", emoji: "⚡" },
  { id: "storytelling", label: "Cerita/Dongeng", emoji: "📚" },
  { id: "slang", label: "Bahasa Gaul", emoji: "🔥" },
];

const MINDMAP_LAYOUTS: { id: MindmapLayout; label: string; emoji: string }[] = [
  { id: "radial", label: "Radial", emoji: "🎯" },
  { id: "tree", label: "Tree", emoji: "🌳" },
  { id: "horizontal", label: "Horizontal", emoji: "➡️" },
  { id: "outline", label: "Outline", emoji: "📋" },
];

interface FlashcardData { front: string; back: string; }
interface QuizQuestion { question: string; options: string[]; correct: number; hint?: string; }
interface MindmapNode { title: string; children?: MindmapNode[]; }

const COLORS = [
  "hsl(172, 66%, 50%)", "hsl(262, 60%, 55%)", "hsl(36, 95%, 55%)", 
  "hsl(340, 65%, 55%)", "hsl(200, 70%, 50%)", "hsl(142, 60%, 45%)",
  "hsl(25, 80%, 55%)", "hsl(280, 55%, 50%)",
];

const StudyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeMode, setActiveMode] = useState<StudyMode>("summary");
  const [toneStyle, setToneStyle] = useState<ToneStyle>("detailed");
  const [mindmapLayout, setMindmapLayout] = useState<MindmapLayout>("radial");
  const [uploadedContent, setUploadedContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>("document");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAnalyzingYT, setIsAnalyzingYT] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const profile = JSON.parse(localStorage.getItem("aqua-study-profile") || "{}");

  const clearContent = () => {
    setUploadedContent(null);
    setUploadedFileName(null);
    setResult(null);
    setFlashcards([]);
    setQuizQuestions([]);
    setMindmapData(null);
    setQuizFinished(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === "video") {
        // For video: convert to base64 for AI analysis
        // Cap at 20MB for edge function limits
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: "Video terlalu besar", description: "Maksimal 20MB untuk analisis video", variant: "destructive" });
          return;
        }
        const base64 = await fileToBase64(file);
        setUploadedContent(base64);
        setUploadedFileName(`🎬 ${file.name}`);
        toast({ title: "Video siap", description: file.name });
        return;
      }

      if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        setUploadedContent(base64);
        setUploadedFileName(`🖼️ ${file.name}`);
        toast({ title: "Gambar siap", description: file.name });
        return;
      }

      let text = "";
      if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        text = await extractTextFromDocx(file);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
        text = await extractTextFromFile(file);
      } else {
        // PDF or other binary
        const base64 = await fileToBase64(file);
        setUploadedContent(base64);
        setUploadedFileName(`📄 ${file.name}`);
        toast({ title: "File siap", description: file.name });
        return;
      }

      setUploadedContent(text.slice(0, 15000));
      setUploadedFileName(`📄 ${file.name}`);
      toast({ title: "File siap", description: `${file.name} (${text.length} karakter)` });
    } catch {
      toast({ title: "Error", description: "Gagal memproses file", variant: "destructive" });
    }
    // Reset input
    e.target.value = "";
  };

  const handleYouTubeAnalyze = async () => {
    if (!youtubeUrl.trim()) return;
    setIsAnalyzingYT(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-youtube', {
        body: {
          videoUrl: youtubeUrl.trim(),
          prompt: 'Ekstrak semua konten, poin utama, dan detail penting dari video ini selengkap mungkin untuk digunakan sebagai materi pembelajaran.'
        }
      });

      if (error) throw error;
      if (data?.success && data?.analysis) {
        setUploadedContent(data.analysis.slice(0, 15000));
        setUploadedFileName(`▶️ ${data.videoTitle || youtubeUrl.trim().slice(0, 40)}`);
        toast({ title: "YouTube berhasil dianalisis", description: data.videoTitle || "Video ready" });
      } else {
        throw new Error(data?.error || "Gagal analisis YouTube");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal analisis YouTube", variant: "destructive" });
    }
    setIsAnalyzingYT(false);
  };

  const getTonePrompt = () => {
    switch (toneStyle) {
      case "detailed": return "Jelaskan dengan detail dan lengkap, sertakan contoh dan penjelasan mendalam.";
      case "brief": return "Berikan ringkasan singkat hanya poin-poin penting saja.";
      case "storytelling": return "Jelaskan seperti bercerita/mendongeng agar mudah dipahami dan menarik.";
      case "slang": return "Jelaskan menggunakan bahasa gaul/santai yang mudah dipahami anak muda.";
    }
  };

  const getModePrompt = () => {
    const educationLevel = profile.education || "sma";
    const ageGroup = profile.age || "13+";
    const base = `Kamu adalah guru AI untuk siswa ${educationLevel.toUpperCase()} usia ${ageGroup}. Bahasa: sesuai bahasa materi/user. `;

    switch (activeMode) {
      case "summary":
        return base + `Buatkan ringkasan pembelajaran dari materi berikut. ${getTonePrompt()} Format dengan heading, bold untuk istilah penting, dan sertakan "Key Takeaway" di akhir.`;
      case "mindmap":
        return base + `Buatkan mindmap/peta konsep dalam format JSON dari materi berikut. Format HARUS: {"title":"...","children":[{"title":"...","children":[...]}]}. Buat minimal 4-6 cabang utama, masing-masing punya 2-4 sub-cabang. Hanya output JSON murni, tanpa markdown code block, tanpa backtick, tanpa penjelasan lain.`;
      case "quiz":
        return base + `Buatkan 10 soal kuis pilihan ganda (A-D) dari materi berikut. Format JSON array: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct":0,"hint":"..."}]. correct = index 0-3. Hanya output JSON murni tanpa markdown code block.`;
      case "flashcards":
        return base + `Buatkan 15-20 flashcard dari materi berikut. Format JSON array: [{"front":"istilah/konsep","back":"penjelasan singkat"}]. Hanya output JSON murni tanpa markdown code block.`;
    }
  };

  const handleGenerate = async () => {
    if (!uploadedContent) {
      toast({ title: "Belum ada materi", description: "Upload dokumen, gambar, video, atau YouTube terlebih dahulu", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setFlashcards([]);
    setQuizQuestions([]);
    setMindmapData(null);
    setCurrentFlashcard(0);
    setCurrentQuiz(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizFinished(false);

    try {
      const prompt = getModePrompt();
      const isBase64 = uploadedContent.startsWith("data:");
      const content = isBase64
        ? `[File terlampir - analisis konten visual dan teks di dalamnya]`
        : uploadedContent;

      const chatResult = await sendChatMessage(
        `${prompt}\n\nMateri:\n${content}`,
        `study-${Date.now()}`,
        { 
          model: "aqualibriav1",
          ...(isBase64 ? { imageData: uploadedContent, imageDataList: [uploadedContent] } : {})
        }
      );

      if (chatResult.success && chatResult.response) {
        if (activeMode === "summary") {
          setResult(chatResult.response);
        } else {
          // Strip markdown code blocks if present
          let rawJson = chatResult.response
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
          
          const jsonMatch = rawJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (activeMode === "flashcards") setFlashcards(Array.isArray(parsed) ? parsed : []);
              else if (activeMode === "quiz") setQuizQuestions(Array.isArray(parsed) ? parsed : []);
              else if (activeMode === "mindmap") setMindmapData(parsed);
            } catch {
              setResult(chatResult.response);
            }
          } else {
            setResult(chatResult.response);
          }
        }
      } else {
        toast({ title: "Error", description: chatResult.error || "Gagal menghasilkan konten", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleQuizAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    if (index === quizQuestions[currentQuiz]?.correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuiz = () => {
    if (currentQuiz < quizQuestions.length - 1) {
      setCurrentQuiz(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizFinished(true);
    }
  };

  // ============ MINDMAP RENDERERS ============

  const renderRadialMindmap = (node: MindmapNode) => {
    if (!node.children || node.children.length === 0) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm text-center shadow-lg">
            {node.title}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Center node */}
        <div className="px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base text-center shadow-lg shadow-primary/30 max-w-[280px]">
          {node.title}
        </div>
        {/* Children in grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {node.children.map((child, i) => (
            <div key={i} className="rounded-2xl border-2 p-3 break-words" style={{ borderColor: COLORS[i % COLORS.length] + '40', background: COLORS[i % COLORS.length] + '08' }}>
              <div className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: COLORS[i % COLORS.length] }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                {child.title}
              </div>
              {child.children?.map((sub, j) => (
                <div key={j} className="ml-4 text-xs text-muted-foreground py-1 border-l-2 pl-3 mb-1" style={{ borderColor: COLORS[i % COLORS.length] + '30' }}>
                  {sub.title}
                  {sub.children?.map((sub2, k) => (
                    <div key={k} className="ml-3 text-[10px] opacity-70 py-0.5">• {sub2.title}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTreeMindmap = (node: MindmapNode, level: number = 0, colorIdx: number = 0) => {
    const color = COLORS[colorIdx % COLORS.length];
    return (
      <div key={node.title} className="w-full">
        <div className={`flex items-start gap-2 ${level > 0 ? 'ml-4' : ''}`}>
          {level > 0 && (
            <div className="flex flex-col items-center mt-2 shrink-0">
              <div className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: color, background: level === 1 ? color : 'transparent' }} />
              {node.children && node.children.length > 0 && <div className="w-0.5 flex-1 min-h-[8px]" style={{ background: color + '30' }} />}
            </div>
          )}
          <div className={`flex-1 min-w-0 ${level === 0 ? 'mb-3' : 'mb-1'}`}>
            <div className={`px-4 py-2.5 rounded-xl break-words ${
              level === 0 ? 'bg-primary text-primary-foreground font-bold text-base shadow-lg' :
              level === 1 ? 'font-bold text-sm border-2' : 'text-xs text-muted-foreground'
            }`} style={level === 1 ? { borderColor: color + '40', color: color } : level > 1 ? { color: 'inherit' } : {}}>
              {node.title}
            </div>
          </div>
        </div>
        {node.children?.map((child, i) => (
          <div key={i}>{renderTreeMindmap(child, level + 1, level === 0 ? i : colorIdx)}</div>
        ))}
      </div>
    );
  };

  const renderHorizontalMindmap = (node: MindmapNode) => {
    if (!node.children) return (
      <div className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">{node.title}</div>
    );

    return (
      <div className="w-full">
        <div className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-base text-center shadow-lg mb-4">
          {node.title}
        </div>
        <div className="space-y-2">
          {node.children.map((child, i) => (
            <div key={i} className="rounded-xl border-l-4 p-3 bg-card" style={{ borderColor: COLORS[i % COLORS.length] }}>
              <div className="font-bold text-sm mb-1.5" style={{ color: COLORS[i % COLORS.length] }}>{child.title}</div>
              {child.children && (
                <div className="flex flex-wrap gap-1.5">
                  {child.children.map((sub, j) => (
                    <span key={j} className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent text-foreground break-words">
                      {sub.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOutlineMindmap = (node: MindmapNode, level: number = 0) => {
    return (
      <div className={level > 0 ? "ml-4" : ""}>
        <div className={`flex items-center gap-2 py-1.5 ${
          level === 0 ? "text-base font-bold text-foreground" :
          level === 1 ? "text-sm font-semibold" : "text-xs text-muted-foreground"
        }`} style={level === 1 ? { color: COLORS[0] } : {}}>
          {level === 0 ? "📌" : level === 1 ? "▸" : "•"} 
          <span className="break-words">{node.title}</span>
        </div>
        {node.children?.map((child, i) => (
          <div key={i}>{renderOutlineMindmap(child, level + 1)}</div>
        ))}
      </div>
    );
  };

  const renderMindmap = (node: MindmapNode) => {
    switch (mindmapLayout) {
      case "radial": return renderRadialMindmap(node);
      case "tree": return renderTreeMindmap(node);
      case "horizontal": return renderHorizontalMindmap(node);
      case "outline": return renderOutlineMindmap(node);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header - sticky */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate("/chat")} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <Logo size="sm" />
            <div>
              <h1 className="font-bold text-sm text-foreground leading-tight">Learning Lab</h1>
              <p className="text-[10px] text-muted-foreground">AI-powered study tools</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">All languages</span>
          </div>
        </div>
      </header>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-[env(safe-area-inset-bottom,16px)]">
          
          {/* Upload Source Tabs */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-foreground">📂 Sumber Materi</h2>
              {uploadedFileName && (
                <button onClick={clearContent} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-medium hover:bg-destructive/20 transition-colors">
                  <X className="w-3 h-3" /> Hapus
                </button>
              )}
            </div>

            {uploadedFileName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 mb-3">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium truncate">{uploadedFileName}</span>
              </div>
            )}

            {/* Source tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-accent/40 mb-3">
              {([
                { id: "document" as SourceTab, icon: <FileText className="w-3.5 h-3.5" />, label: "Dokumen" },
                { id: "image" as SourceTab, icon: <LucideImage className="w-3.5 h-3.5" />, label: "Gambar" },
                { id: "video" as SourceTab, icon: <Video className="w-3.5 h-3.5" />, label: "Video" },
                { id: "youtube" as SourceTab, icon: <Youtube className="w-3.5 h-3.5" />, label: "YouTube" },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setSourceTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                    sourceTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab.icon}
                  <span className="hidden min-[400px]:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {sourceTab === "document" && (
                <motion.button key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-accent/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">Upload Dokumen</p>
                    <p className="text-[11px] text-muted-foreground">PDF, DOCX, TXT — tanpa batas ukuran</p>
                  </div>
                </motion.button>
              )}

              {sourceTab === "image" && (
                <motion.button key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-accent/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <LucideImage className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">Upload Gambar / OCR</p>
                    <p className="text-[11px] text-muted-foreground">Scan catatan tangan, foto materi</p>
                  </div>
                </motion.button>
              )}

              {sourceTab === "video" && (
                <motion.button key="vid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-accent/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">Upload Video</p>
                    <p className="text-[11px] text-muted-foreground">MP4, WEBM — maks 20MB</p>
                  </div>
                </motion.button>
              )}

              {sourceTab === "youtube" && (
                <motion.div key="yt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full pl-9 pr-3 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        onKeyDown={(e) => e.key === "Enter" && handleYouTubeAnalyze()}
                      />
                    </div>
                    <button onClick={handleYouTubeAnalyze} disabled={isAnalyzingYT || !youtubeUrl.trim()}
                      className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center gap-1.5 shrink-0">
                      {isAnalyzingYT ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Analisis
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">AI akan menganalisis konten video berdasarkan metadata & konteks</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Learning Mode */}
          <section className="mb-4">
            <h2 className="font-bold text-base text-foreground mb-3">🎯 Mode Pembelajaran</h2>
            <div className="grid grid-cols-4 gap-2">
              {STUDY_MODES.map((mode) => (
                <button key={mode.id} onClick={() => setActiveMode(mode.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center transition-all ${
                    activeMode === mode.id 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "bg-card border border-border text-foreground hover:border-primary/30"
                  }`}>
                  <span className="text-lg">{mode.emoji}</span>
                  <span className="text-[11px] font-bold leading-tight">{mode.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Tone (summary only) */}
          {activeMode === "summary" && (
            <section className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Gaya Penjelasan</p>
              <div className="flex gap-2 flex-wrap">
                {TONE_OPTIONS.map((tone) => (
                  <button key={tone.id} onClick={() => setToneStyle(tone.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      toneStyle === tone.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground bg-accent/50"
                    }`}>
                    {tone.emoji} {tone.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Mindmap Layout (mindmap only) */}
          {activeMode === "mindmap" && (
            <section className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Layout Mindmap</p>
              <div className="flex gap-2 flex-wrap">
                {MINDMAP_LAYOUTS.map((layout) => (
                  <button key={layout.id} onClick={() => setMindmapLayout(layout.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      mindmapLayout === layout.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground bg-accent/50"
                    }`}>
                    {layout.emoji} {layout.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Generate Button */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} disabled={isProcessing || !uploadedContent}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm mb-6 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.97]">
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Menghasilkan...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate {STUDY_MODES.find(m => m.id === activeMode)?.label}</>
            )}
          </motion.button>

          {/* ============ RESULTS ============ */}
          <AnimatePresence mode="wait">
            {/* Summary Result */}
            {result && activeMode === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-4 mb-6 overflow-hidden">
                <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere">
                  <MarkdownRenderer content={result} />
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-3">
                  <button onClick={handleGenerate} className="flex items-center gap-1.5 text-[11px] text-primary font-bold hover:underline">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              </motion.div>
            )}

            {/* Mindmap Result */}
            {mindmapData && activeMode === "mindmap" && (
              <motion.div key="mindmap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-4 mb-6 overflow-x-auto overflow-y-visible">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground">🧠 Mindmap — {MINDMAP_LAYOUTS.find(l => l.id === mindmapLayout)?.label}</span>
                  <button onClick={handleGenerate} className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="min-w-0 w-full">
                  {renderMindmap(mindmapData)}
                </div>
              </motion.div>
            )}

            {/* Quiz Result */}
            {quizQuestions.length > 0 && activeMode === "quiz" && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-4 mb-6">
                
                {!quizFinished ? (
                  <>
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-muted-foreground font-bold">Soal {currentQuiz + 1}/{quizQuestions.length}</span>
                      <span className="text-[11px] font-bold text-primary">✅ Skor: {quizScore}</span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-1.5 mb-4">
                      <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${((currentQuiz + 1) / quizQuestions.length) * 100}%` }} />
                    </div>

                    {/* Question */}
                    <h3 className="text-sm font-bold text-foreground mb-4 break-words">{quizQuestions[currentQuiz]?.question}</h3>

                    {/* Options */}
                    <div className="space-y-2 mb-4">
                      {quizQuestions[currentQuiz]?.options.map((opt, i) => {
                        const isCorrect = i === quizQuestions[currentQuiz]?.correct;
                        const isSelected = selectedAnswer === i;
                        const answered = selectedAnswer !== null;
                        return (
                          <button key={i} onClick={() => handleQuizAnswer(i)} disabled={answered}
                            className={`w-full px-3 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all flex items-center gap-2.5 break-words ${
                              answered && isCorrect ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                              : answered && isSelected && !isCorrect ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                              : !answered ? "border-border hover:border-primary/40 active:bg-accent" : "border-border opacity-60"
                            }`}>
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              answered && isCorrect ? "bg-green-500 text-white" 
                              : answered && isSelected ? "bg-red-500 text-white" 
                              : "bg-accent text-muted-foreground"
                            }`}>{String.fromCharCode(65 + i)}</span>
                            <span className="flex-1 min-w-0 break-words">{opt}</span>
                            {answered && isCorrect && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                            {answered && isSelected && !isCorrect && <X className="w-4 h-4 text-red-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Hint */}
                    {selectedAnswer !== null && quizQuestions[currentQuiz]?.hint && (
                      <p className="text-[11px] text-muted-foreground bg-accent/50 rounded-lg p-2.5 mb-3 break-words">
                        💡 {quizQuestions[currentQuiz].hint}
                      </p>
                    )}

                    {/* Next button */}
                    {selectedAnswer !== null && (
                      <button onClick={nextQuiz} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                        {currentQuiz < quizQuestions.length - 1 ? "Selanjutnya →" : "Lihat Hasil 🎉"}
                      </button>
                    )}
                  </>
                ) : (
                  /* Quiz Complete */
                  <div className="text-center py-6">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Kuis Selesai!</h3>
                    <div className="text-3xl font-bold text-primary mb-2">{quizScore}/{quizQuestions.length}</div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {quizScore === quizQuestions.length ? "Sempurna! Kamu hebat! 🌟" :
                       quizScore >= quizQuestions.length * 0.7 ? "Bagus sekali! 👏" :
                       quizScore >= quizQuestions.length * 0.5 ? "Cukup baik, terus belajar! 💪" :
                       "Jangan menyerah, coba lagi! 📚"}
                    </p>
                    <button onClick={() => { setCurrentQuiz(0); setSelectedAnswer(null); setQuizScore(0); setQuizFinished(false); }}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Ulangi Kuis
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Flashcards Result */}
            {flashcards.length > 0 && activeMode === "flashcards" && (
              <motion.div key="flashcards" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
                {/* Card */}
                <motion.div whileTap={{ scale: 0.98 }} onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                  className="bg-primary rounded-2xl p-6 min-h-[180px] flex flex-col items-center justify-center cursor-pointer shadow-lg shadow-primary/20 mb-4 relative overflow-hidden">
                  <span className="absolute top-3 right-3 text-[10px] text-primary-foreground/40 uppercase tracking-widest">
                    {flashcardFlipped ? "Jawaban" : "Tap untuk flip"}
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.p key={flashcardFlipped ? "back" : "front"} 
                      initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="text-lg font-bold text-primary-foreground text-center break-words px-2 max-w-full">
                      {flashcardFlipped ? flashcards[currentFlashcard]?.back : flashcards[currentFlashcard]?.front}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-bold">{currentFlashcard + 1}/{flashcards.length}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentFlashcard(prev => Math.max(0, prev - 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === 0}
                      className="p-2.5 rounded-xl bg-card border border-border disabled:opacity-30">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setCurrentFlashcard(prev => Math.min(flashcards.length - 1, prev + 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === flashcards.length - 1}
                      className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-1 mt-3 flex-wrap">
                  {flashcards.map((_, i) => (
                    <button key={i} onClick={() => { setCurrentFlashcard(i); setFlashcardFlipped(false); }}
                      className={`w-2 h-2 rounded-full transition-all ${i === currentFlashcard ? "bg-primary w-4" : "bg-border hover:bg-muted-foreground/30"}`} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Fallback text result */}
            {result && activeMode !== "summary" && (
              <motion.div key="fallback" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-4 mb-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Format tidak terdeteksi, menampilkan sebagai teks</span>
                </div>
                <div className="prose prose-sm max-w-none break-words">
                  <MarkdownRenderer content={result} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFileUpload(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, "video")} />
    </div>
  );
};

export default StudyDashboard;
