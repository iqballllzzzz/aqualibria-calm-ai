import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Youtube, Image as LucideImage, Upload, ArrowLeft,
  BookOpen, Brain, HelpCircle, Layers, RefreshCw, X, Loader2, 
  ChevronRight, ChevronLeft, Globe, Sparkles, Video,
  Link2, Check, AlertCircle, RotateCcw, Download, History, Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendChatMessage, fileToBase64, extractTextFromDocx, extractTextFromFile } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Logo from "@/components/Logo";
import jsPDF from "jspdf";

type StudyMode = "summary" | "mindmap" | "quiz" | "flashcards";
type ToneStyle = "detailed" | "brief" | "storytelling" | "slang";
type MindmapLayout = "radial" | "tree" | "horizontal" | "outline";
type SourceTab = "document" | "image" | "video" | "youtube";
type ViewTab = "study" | "history";

const STUDY_MODES: { id: StudyMode; label: string; emoji: string }[] = [
  { id: "summary", label: "Ringkasan", emoji: "📝" },
  { id: "mindmap", label: "Mindmap", emoji: "🧠" },
  { id: "quiz", label: "Kuis", emoji: "❓" },
  { id: "flashcards", label: "Kartu", emoji: "🃏" },
];

const TONE_OPTIONS: { id: ToneStyle; label: string; emoji: string }[] = [
  { id: "detailed", label: "Lengkap", emoji: "📖" },
  { id: "brief", label: "Singkat", emoji: "⚡" },
  { id: "storytelling", label: "Cerita", emoji: "📚" },
  { id: "slang", label: "Gaul", emoji: "🔥" },
];

const MINDMAP_LAYOUTS: { id: MindmapLayout; label: string; emoji: string }[] = [
  { id: "radial", label: "Radial", emoji: "🎯" },
  { id: "tree", label: "Tree", emoji: "🌳" },
  { id: "horizontal", label: "Card", emoji: "➡️" },
  { id: "outline", label: "List", emoji: "📋" },
];

interface FlashcardData { front: string; back: string; }
interface QuizQuestion { question: string; options: string[]; correct: number; hint?: string; }
interface MindmapNode { title: string; children?: MindmapNode[]; }
interface StudyHistoryItem { id: string; title: string; mode: string; date: string; content: string; }

const COLORS = [
  "hsl(172, 66%, 50%)", "hsl(262, 60%, 55%)", "hsl(36, 95%, 55%)", 
  "hsl(340, 65%, 55%)", "hsl(200, 70%, 50%)", "hsl(142, 60%, 45%)",
  "hsl(25, 80%, 55%)", "hsl(280, 55%, 50%)",
];

const StudyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [viewTab, setViewTab] = useState<ViewTab>("study");
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
  const [studyHistory, setStudyHistory] = useState<StudyHistoryItem[]>([]);
  const [showResult, setShowResult] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const profile = JSON.parse(localStorage.getItem("aqua-study-profile") || "{}");

  // Load study history from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("aqua-study-history");
      if (saved) setStudyHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = (title: string, mode: string, content: string) => {
    const item: StudyHistoryItem = {
      id: `sh_${Date.now()}`,
      title: title.slice(0, 60),
      mode,
      date: new Date().toISOString(),
      content: content.slice(0, 5000),
    };
    const updated = [item, ...studyHistory].slice(0, 50);
    setStudyHistory(updated);
    try { localStorage.setItem("aqua-study-history", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const clearContent = () => {
    setUploadedContent(null);
    setUploadedFileName(null);
    setResult(null);
    setFlashcards([]);
    setQuizQuestions([]);
    setMindmapData(null);
    setQuizFinished(false);
    setShowResult(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (type === "video") {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: "Video terlalu besar", description: "Maksimal 20MB", variant: "destructive" });
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
      toast({ title: "Error YouTube", description: err.message || "Gagal analisis YouTube", variant: "destructive" });
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

  const getEducationLabel = () => {
    const map: Record<string, string> = { sd: "SD", smp: "SMP", sma: "SMA", kuliah: "Mahasiswa" };
    return map[profile.education] || "SMA";
  };

  const getModePrompt = () => {
    const edu = getEducationLabel();
    const age = profile.age || "13+";
    const base = `Kamu adalah guru AI yang ramah dan bersemangat untuk siswa ${edu} usia ${age}. Bahasa: Indonesia atau sesuai bahasa materi. `;

    switch (activeMode) {
      case "summary":
        return base + `Buatkan ringkasan pembelajaran dari materi berikut. ${getTonePrompt()}

INSTRUKSI FORMAT PENTING:
- Mulai LANGSUNG dengan judul materi (tanpa kata pembuka seperti "Berikut ringkasan..." atau "Tentu!").
- Tulis seolah-olah kamu sedang mengajar langsung ke siswa. Contoh gaya: "Oke anak-anak, jadi materi kita hari ini tentang..." 
- Gunakan heading (##), bold (**kata penting**), dan bullet points.
- Akhiri dengan "## 🎯 Key Takeaway" yang berisi poin-poin paling penting.
- Buat penjelasan semenarik mungkin agar siswa mudah paham.`;
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
    setShowResult(false);

    try {
      const prompt = getModePrompt();
      const isBase64 = uploadedContent.startsWith("data:");
      const content = isBase64 ? `[File terlampir - analisis konten visual dan teks di dalamnya]` : uploadedContent;

      const chatResult = await sendChatMessage(
        `${prompt}\n\nMateri:\n${content}`,
        `study-${Date.now()}`,
        { 
          model: "aqualibriav1",
          ...(isBase64 ? { imageData: uploadedContent, imageDataList: [uploadedContent] } : {})
        }
      );

      if (chatResult.success && chatResult.response) {
        setShowResult(true);
        if (activeMode === "summary") {
          setResult(chatResult.response);
          saveToHistory(uploadedFileName || "Ringkasan", "summary", chatResult.response);
        } else {
          let rawJson = chatResult.response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          const jsonMatch = rawJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (activeMode === "flashcards") { setFlashcards(Array.isArray(parsed) ? parsed : []); saveToHistory(uploadedFileName || "Flashcards", "flashcards", chatResult.response); }
              else if (activeMode === "quiz") { setQuizQuestions(Array.isArray(parsed) ? parsed : []); saveToHistory(uploadedFileName || "Kuis", "quiz", chatResult.response); }
              else if (activeMode === "mindmap") { setMindmapData(parsed); saveToHistory(uploadedFileName || "Mindmap", "mindmap", chatResult.response); }
            } catch {
              setResult(chatResult.response);
            }
          } else {
            setResult(chatResult.response);
          }
        }
        // Scroll to result
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
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
    if (index === quizQuestions[currentQuiz]?.correct) setQuizScore(prev => prev + 1);
  };

  const nextQuiz = () => {
    if (currentQuiz < quizQuestions.length - 1) { setCurrentQuiz(prev => prev + 1); setSelectedAnswer(null); }
    else setQuizFinished(true);
  };

  const handleExportPDF = (content: string, title: string) => {
    const doc = new jsPDF();
    const clean = content.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s*/g, "").replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, "")).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("AquaLibriaAI — Learning Lab", 15, 10);
    doc.setFontSize(10);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(clean, 180);
    let y = 18;
    for (const line of lines) {
      if (y > doc.internal.pageSize.height - 15) { doc.addPage(); y = 15; }
      doc.text(line, 15, y);
      y += 5;
    }
    doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
    toast({ title: "PDF berhasil di-export!" });
  };

  // ============ MINDMAP RENDERERS ============
  const renderRadialMindmap = (node: MindmapNode) => (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs text-center shadow-md max-w-[220px] break-words">
        {node.title}
      </div>
      {node.children && (
        <div className="grid grid-cols-2 gap-2 w-full">
          {node.children.map((child, i) => (
            <div key={i} className="rounded-xl border p-2 break-words text-xs" style={{ borderColor: COLORS[i % COLORS.length] + '40', background: COLORS[i % COLORS.length] + '08' }}>
              <div className="font-bold text-[11px] mb-1 flex items-center gap-1" style={{ color: COLORS[i % COLORS.length] }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="break-words">{child.title}</span>
              </div>
              {child.children?.map((sub, j) => (
                <div key={j} className="ml-3 text-[10px] text-muted-foreground py-0.5 border-l pl-2 mb-0.5 break-words" style={{ borderColor: COLORS[i % COLORS.length] + '30' }}>
                  {sub.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTreeMindmap = (node: MindmapNode, level = 0, colorIdx = 0) => {
    const color = COLORS[colorIdx % COLORS.length];
    return (
      <div key={node.title} className="w-full">
        <div className={`flex items-start gap-1.5 ${level > 0 ? 'ml-3' : ''}`}>
          {level > 0 && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: level === 1 ? color : color + '60', border: `1.5px solid ${color}` }} />}
          <div className={`flex-1 min-w-0 mb-1 ${
            level === 0 ? 'px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md' :
            level === 1 ? 'font-bold text-[11px]' : 'text-[10px] text-muted-foreground'
          }`} style={level === 1 ? { color } : {}}>
            <span className="break-words">{node.title}</span>
          </div>
        </div>
        {node.children?.map((child, i) => (
          <div key={i}>{renderTreeMindmap(child, level + 1, level === 0 ? i : colorIdx)}</div>
        ))}
      </div>
    );
  };

  const renderHorizontalMindmap = (node: MindmapNode) => (
    <div className="w-full space-y-2">
      <div className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs text-center shadow-md">
        {node.title}
      </div>
      {node.children?.map((child, i) => (
        <div key={i} className="rounded-xl border-l-3 p-2 bg-card break-words" style={{ borderColor: COLORS[i % COLORS.length], borderLeftWidth: '3px' }}>
          <div className="font-bold text-[11px] mb-1" style={{ color: COLORS[i % COLORS.length] }}>{child.title}</div>
          {child.children && (
            <div className="flex flex-wrap gap-1">
              {child.children.map((sub, j) => (
                <span key={j} className="inline-block px-2 py-0.5 rounded-md text-[9px] font-medium bg-accent text-foreground break-words">{sub.title}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderOutlineMindmap = (node: MindmapNode, level = 0) => (
    <div className={level > 0 ? "ml-3" : ""}>
      <div className={`flex items-center gap-1.5 py-0.5 ${
        level === 0 ? "text-xs font-bold text-foreground" :
        level === 1 ? "text-[11px] font-semibold" : "text-[10px] text-muted-foreground"
      }`} style={level === 1 ? { color: COLORS[0] } : {}}>
        {level === 0 ? "📌" : level === 1 ? "▸" : "•"} 
        <span className="break-words">{node.title}</span>
      </div>
      {node.children?.map((child, i) => (
        <div key={i}>{renderOutlineMindmap(child, level + 1)}</div>
      ))}
    </div>
  );

  const renderMindmap = (node: MindmapNode) => {
    switch (mindmapLayout) {
      case "radial": return renderRadialMindmap(node);
      case "tree": return renderTreeMindmap(node);
      case "horizontal": return renderHorizontalMindmap(node);
      case "outline": return renderOutlineMindmap(node);
    }
  };

  const hasResults = showResult && (result || mindmapData || quizQuestions.length > 0 || flashcards.length > 0);

  return (
    <div className="min-h-[100dvh] max-h-[100dvh] bg-background flex flex-col overflow-hidden relative">
      <div className="spotlight spotlight-violet" style={{ width: "36vw", height: "36vw", top: "-12%", left: "-12%", opacity: 0.14 }} />
      <div className="spotlight spotlight-cyan" style={{ width: "28vw", height: "28vw", bottom: "-10%", right: "-10%", opacity: 0.12 }} />

      {/* Header */}
      <header className="sticky top-0 z-30 surface-glass border-b border-border/60 px-3 py-2.5 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/chat")} className="p-1.5 -ml-1 rounded-xl hover:bg-accent transition-colors" aria-label="Back to chat">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <Logo size="sm" />
            <div>
              <h1 className="font-display font-bold tracking-tight text-xs text-foreground leading-tight">Learning Lab</h1>
              <p className="text-[9px] text-muted-foreground">{getEducationLabel()} · {profile.age || "13+"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewTab(viewTab === "study" ? "history" : "study")} 
              className={`p-2 rounded-xl transition-colors ${viewTab === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
              {viewTab === "history" ? <BookOpen className="w-4 h-4" /> : <History className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-3 py-3 pb-6">
          
          {viewTab === "history" ? (
            /* ===== HISTORY TAB ===== */
            <div>
              <h2 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Riwayat Pembelajaran
              </h2>
              {studyHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada riwayat pembelajaran</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studyHistory.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-foreground truncate flex-1">{item.title}</span>
                        <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{item.mode}</span>
                        <button onClick={() => handleExportPDF(item.content, item.title)} className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ===== STUDY TAB ===== */
            <>
              {/* Upload Source */}
              <section className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-xs text-foreground">📂 Sumber Materi</h2>
                  {uploadedFileName && (
                    <button onClick={clearContent} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive text-[10px] font-medium">
                      <X className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>

                {uploadedFileName && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 mb-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[10px] text-primary font-medium truncate">{uploadedFileName}</span>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-0.5 p-0.5 rounded-lg bg-accent/40 mb-2">
                  {([
                    { id: "document" as SourceTab, icon: <FileText className="w-3 h-3" />, label: "Doc" },
                    { id: "image" as SourceTab, icon: <LucideImage className="w-3 h-3" />, label: "Img" },
                    { id: "video" as SourceTab, icon: <Video className="w-3 h-3" />, label: "Vid" },
                    { id: "youtube" as SourceTab, icon: <Youtube className="w-3 h-3" />, label: "YT" },
                  ]).map(tab => (
                    <button key={tab.id} onClick={() => setSourceTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        sourceTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}>
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {sourceTab === "document" && (
                    <motion.button key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/40 bg-card transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Upload Dokumen</p>
                        <p className="text-[9px] text-muted-foreground">PDF, DOCX, TXT</p>
                      </div>
                    </motion.button>
                  )}
                  {sourceTab === "image" && (
                    <motion.button key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/40 bg-card transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <LucideImage className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Upload Gambar</p>
                        <p className="text-[9px] text-muted-foreground">Foto catatan, materi</p>
                      </div>
                    </motion.button>
                  )}
                  {sourceTab === "video" && (
                    <motion.button key="vid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/40 bg-card transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Upload Video</p>
                        <p className="text-[9px] text-muted-foreground">MP4, WEBM — maks 20MB</p>
                      </div>
                    </motion.button>
                  )}
                  {sourceTab === "youtube" && (
                    <motion.div key="yt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <div className="flex-1 relative">
                          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full pl-8 pr-2 py-2.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary/50"
                            onKeyDown={(e) => e.key === "Enter" && handleYouTubeAnalyze()}
                          />
                        </div>
                        <button onClick={handleYouTubeAnalyze} disabled={isAnalyzingYT || !youtubeUrl.trim()}
                          className="px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] disabled:opacity-40 flex items-center gap-1 shrink-0">
                          {isAnalyzingYT ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Go
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Learning Mode */}
              <section className="mb-3">
                <h2 className="font-bold text-xs text-foreground mb-2">🎯 Mode</h2>
                <div className="grid grid-cols-4 gap-1.5">
                  {STUDY_MODES.map((mode) => (
                    <button key={mode.id} onClick={() => setActiveMode(mode.id)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all ${
                        activeMode === mode.id 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "bg-card border border-border text-foreground"
                      }`}>
                      <span className="text-base">{mode.emoji}</span>
                      <span className="text-[9px] font-bold leading-tight">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Options */}
              {activeMode === "summary" && (
                <section className="mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {TONE_OPTIONS.map((tone) => (
                      <button key={tone.id} onClick={() => setToneStyle(tone.id)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          toneStyle === tone.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground bg-accent/50"
                        }`}>
                        {tone.emoji} {tone.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {activeMode === "mindmap" && (
                <section className="mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {MINDMAP_LAYOUTS.map((layout) => (
                      <button key={layout.id} onClick={() => setMindmapLayout(layout.id)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                          mindmapLayout === layout.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground bg-accent/50"
                        }`}>
                        {layout.emoji} {layout.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Generate Button */}
              <button onClick={handleGenerate} disabled={isProcessing || !uploadedContent}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs mb-4 disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-primary/20">
                {isProcessing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menghasilkan...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Generate {STUDY_MODES.find(m => m.id === activeMode)?.label}</>
                )}
              </button>

              {/* ============ RESULTS ============ */}
              <div ref={resultRef}>
                <AnimatePresence mode="wait">
                  {/* Summary */}
                  {result && activeMode === "summary" && (
                    <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
                      <div className="max-h-[60vh] overflow-y-auto p-3">
                        <div className="prose prose-sm max-w-none break-words text-xs leading-relaxed [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-[11px] [&_p]:text-xs [&_li]:text-xs">
                          <MarkdownRenderer content={result} />
                        </div>
                      </div>
                      <div className="px-3 py-2 border-t border-border flex items-center gap-3">
                        <button onClick={handleGenerate} className="flex items-center gap-1 text-[10px] text-primary font-bold">
                          <RefreshCw className="w-3 h-3" /> Ulang
                        </button>
                        <button onClick={() => handleExportPDF(result, uploadedFileName || "Ringkasan")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-bold">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Mindmap */}
                  {mindmapData && activeMode === "mindmap" && (
                    <motion.div key="mindmap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
                      <div className="max-h-[60vh] overflow-y-auto p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground">🧠 {MINDMAP_LAYOUTS.find(l => l.id === mindmapLayout)?.label}</span>
                          <button onClick={handleGenerate} className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                            <RefreshCw className="w-3 h-3" /> Ulang
                          </button>
                        </div>
                        {renderMindmap(mindmapData)}
                      </div>
                    </motion.div>
                  )}

                  {/* Quiz */}
                  {quizQuestions.length > 0 && activeMode === "quiz" && (
                    <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-card border border-border rounded-xl p-3 mb-4">
                      {!quizFinished ? (
                        <div className="max-h-[55vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-muted-foreground font-bold">Soal {currentQuiz + 1}/{quizQuestions.length}</span>
                            <span className="text-[10px] font-bold text-primary">✅ {quizScore}</span>
                          </div>
                          <div className="w-full bg-accent rounded-full h-1 mb-3">
                            <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${((currentQuiz + 1) / quizQuestions.length) * 100}%` }} />
                          </div>
                          <h3 className="text-xs font-bold text-foreground mb-3 break-words">{quizQuestions[currentQuiz]?.question}</h3>
                          <div className="space-y-1.5 mb-3">
                            {quizQuestions[currentQuiz]?.options.map((opt, i) => {
                              const isCorrect = i === quizQuestions[currentQuiz]?.correct;
                              const isSelected = selectedAnswer === i;
                              const answered = selectedAnswer !== null;
                              return (
                                <button key={i} onClick={() => handleQuizAnswer(i)} disabled={answered}
                                  className={`w-full px-2.5 py-2 rounded-lg border text-left text-[11px] font-medium flex items-center gap-2 break-words ${
                                    answered && isCorrect ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                                    : answered && isSelected && !isCorrect ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                                    : !answered ? "border-border hover:border-primary/40" : "border-border opacity-50"
                                  }`}>
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                    answered && isCorrect ? "bg-green-500 text-white" : answered && isSelected ? "bg-red-500 text-white" : "bg-accent text-muted-foreground"
                                  }`}>{String.fromCharCode(65 + i)}</span>
                                  <span className="flex-1 min-w-0 break-words">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                          {selectedAnswer !== null && quizQuestions[currentQuiz]?.hint && (
                            <p className="text-[10px] text-muted-foreground bg-accent/50 rounded-lg p-2 mb-2 break-words">💡 {quizQuestions[currentQuiz].hint}</p>
                          )}
                          {selectedAnswer !== null && (
                            <button onClick={nextQuiz} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-[11px]">
                              {currentQuiz < quizQuestions.length - 1 ? "Selanjutnya →" : "Lihat Hasil 🎉"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-3xl mb-2">🎉</div>
                          <h3 className="text-sm font-bold text-foreground mb-1">Kuis Selesai!</h3>
                          <div className="text-2xl font-bold text-primary mb-1">{quizScore}/{quizQuestions.length}</div>
                          <p className="text-[11px] text-muted-foreground mb-3">
                            {quizScore === quizQuestions.length ? "Sempurna! 🌟" :
                             quizScore >= quizQuestions.length * 0.7 ? "Bagus! 👏" :
                             quizScore >= quizQuestions.length * 0.5 ? "Lumayan! 💪" : "Coba lagi! 📚"}
                          </p>
                          <button onClick={() => { setCurrentQuiz(0); setSelectedAnswer(null); setQuizScore(0); setQuizFinished(false); }}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] inline-flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" /> Ulangi
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Flashcards */}
                  {flashcards.length > 0 && activeMode === "flashcards" && (
                    <motion.div key="flashcards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4">
                      <motion.div whileTap={{ scale: 0.98 }} onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                        className="bg-primary rounded-xl p-4 min-h-[120px] flex flex-col items-center justify-center cursor-pointer shadow-md mb-3 relative">
                        <span className="absolute top-2 right-2 text-[8px] text-primary-foreground/40 uppercase tracking-widest">
                          {flashcardFlipped ? "Jawaban" : "Tap untuk flip"}
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.p key={flashcardFlipped ? "back" : "front"} 
                            initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="text-sm font-bold text-primary-foreground text-center break-words px-2 max-w-full">
                            {flashcardFlipped ? flashcards[currentFlashcard]?.back : flashcards[currentFlashcard]?.front}
                          </motion.p>
                        </AnimatePresence>
                      </motion.div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-bold">{currentFlashcard + 1}/{flashcards.length}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setCurrentFlashcard(prev => Math.max(0, prev - 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === 0}
                            className="p-2 rounded-lg bg-card border border-border disabled:opacity-30">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setCurrentFlashcard(prev => Math.min(flashcards.length - 1, prev + 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === flashcards.length - 1}
                            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-center gap-0.5 mt-2 flex-wrap">
                        {flashcards.map((_, i) => (
                          <button key={i} onClick={() => { setCurrentFlashcard(i); setFlashcardFlipped(false); }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentFlashcard ? "bg-primary w-3" : "bg-border"}`} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Fallback */}
                  {result && activeMode !== "summary" && (
                    <motion.div key="fallback" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-card border border-border rounded-xl p-3 mb-4">
                      <div className="max-h-[50vh] overflow-y-auto">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] text-muted-foreground">Menampilkan sebagai teks</span>
                        </div>
                        <div className="prose prose-sm max-w-none break-words text-xs">
                          <MarkdownRenderer content={result} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
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
