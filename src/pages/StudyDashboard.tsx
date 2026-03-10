import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Youtube, Image as LucideImage, Upload, ArrowLeft,
  BookOpen, Brain, HelpCircle, Layers, RefreshCw, X, Loader2, 
  ChevronDown, Globe, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendChatMessage, fileToBase64, extractTextFromDocx, extractTextFromFile } from "@/lib/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Logo from "@/components/Logo";

type StudyMode = "summary" | "mindmap" | "quiz" | "flashcards";
type ToneStyle = "detailed" | "brief" | "storytelling" | "slang";

const STUDY_MODES: { id: StudyMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "summary", label: "Ringkasan", icon: <BookOpen className="w-5 h-5" />, desc: "Rangkuman materi" },
  { id: "mindmap", label: "Mindmap", icon: <Brain className="w-5 h-5" />, desc: "Peta konsep visual" },
  { id: "quiz", label: "Kuis", icon: <HelpCircle className="w-5 h-5" />, desc: "Uji pemahamanmu" },
  { id: "flashcards", label: "Flashcards", icon: <Layers className="w-5 h-5" />, desc: "Kartu belajar" },
];

const TONE_OPTIONS: { id: ToneStyle; label: string }[] = [
  { id: "detailed", label: "Jelas & Lengkap" },
  { id: "brief", label: "Singkat Poin Penting" },
  { id: "storytelling", label: "Cerita/Dongeng" },
  { id: "slang", label: "Bahasa Gaul" },
];

const SOURCE_TYPES = [
  { id: "document", label: "Document (PDF)", icon: <FileText className="w-8 h-8 text-primary" />, desc: "Upload materi belajar", accept: ".pdf,.doc,.docx,.txt" },
  { id: "video", label: "Video Link/File", icon: <Youtube className="w-8 h-8 text-primary" />, desc: "YouTube atau video lokal", accept: "" },
  { id: "image", label: "Image / OCR", icon: <LucideImage className="w-8 h-8 text-primary" />, desc: "Scan catatan tangan", accept: "image/*" },
];

interface FlashcardData {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  hint?: string;
}

interface MindmapNode {
  title: string;
  children?: MindmapNode[];
}

const StudyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeMode, setActiveMode] = useState<StudyMode>("summary");
  const [toneStyle, setToneStyle] = useState<ToneStyle>("detailed");
  const [uploadedContent, setUploadedContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [mindmapData, setMindmapData] = useState<MindmapNode | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const profile = JSON.parse(localStorage.getItem("aqua-study-profile") || "{}");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = "";
      if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        setUploadedContent(base64);
        setUploadedFileName(file.name);
        toast({ title: "Gambar siap", description: file.name });
        return;
      }

      if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        text = await extractTextFromDocx(file);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
        text = await extractTextFromFile(file);
      } else {
        const base64 = await fileToBase64(file);
        setUploadedContent(base64);
        setUploadedFileName(file.name);
        toast({ title: "File siap", description: file.name });
        return;
      }

      setUploadedContent(text.slice(0, 15000));
      setUploadedFileName(file.name);
      toast({ title: "File siap", description: `${file.name} (${text.length} karakter)` });
    } catch {
      toast({ title: "Error", description: "Gagal memproses file", variant: "destructive" });
    }
  };

  const handleVideoSubmit = () => {
    if (!videoUrl.trim()) return;
    setUploadedContent(`[YouTube Video URL]: ${videoUrl.trim()}`);
    setUploadedFileName(`Video: ${videoUrl.trim().slice(0, 40)}`);
    setShowVideoInput(false);
    toast({ title: "Video siap", description: "Link video berhasil ditambahkan" });
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
        return base + `Buatkan mindmap/peta konsep dalam format JSON dari materi berikut. Format: {"title":"...","children":[{"title":"...","children":[...]}]}. Hanya output JSON, tanpa markdown atau penjelasan lain.`;
      case "quiz":
        return base + `Buatkan 10 soal kuis pilihan ganda (A-D) dari materi berikut. Format JSON array: [{"question":"...","options":["A","B","C","D"],"correct":0,"hint":"..."}]. correct = index 0-3. Hanya output JSON.`;
      case "flashcards":
        return base + `Buatkan 15-20 flashcard dari materi berikut. Format JSON array: [{"front":"istilah/konsep","back":"penjelasan singkat"}]. Hanya output JSON.`;
    }
  };

  const handleGenerate = async () => {
    if (!uploadedContent) {
      toast({ title: "Belum ada materi", description: "Upload dokumen, gambar, atau video terlebih dahulu", variant: "destructive" });
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

    try {
      const prompt = getModePrompt();
      const content = uploadedContent.startsWith("data:") 
        ? `[File gambar/PDF terlampir - analisis konten visual dan teks di dalamnya]`
        : uploadedContent;

      const chatResult = await sendChatMessage(
        `${prompt}\n\nMateri:\n${content}`,
        `study-${Date.now()}`,
        { 
          model: "aqualibriav1",
          ...(uploadedContent.startsWith("data:") ? { imageData: uploadedContent, imageDataList: [uploadedContent] } : {})
        }
      );

      if (chatResult.success && chatResult.response) {
        if (activeMode === "summary") {
          setResult(chatResult.response);
        } else {
          // Parse JSON from response
          const jsonMatch = chatResult.response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (activeMode === "flashcards") setFlashcards(Array.isArray(parsed) ? parsed : []);
              else if (activeMode === "quiz") setQuizQuestions(Array.isArray(parsed) ? parsed : []);
              else if (activeMode === "mindmap") setMindmapData(parsed);
            } catch {
              // If JSON parse fails, show as text
              setResult(chatResult.response);
            }
          } else {
            setResult(chatResult.response);
          }
        }
      } else {
        toast({ title: "Error", description: chatResult.error || "Gagal menghasilkan konten", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedAnswer(index);
    if (index === quizQuestions[currentQuiz]?.correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuiz = () => {
    if (currentQuiz < quizQuestions.length - 1) {
      setCurrentQuiz(prev => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const renderMindmapNode = (node: MindmapNode, level: number = 0) => (
    <div key={node.title} className={`${level > 0 ? "ml-6 border-l-2 border-primary/20 pl-4" : ""}`}>
      <div className={`my-2 px-4 py-3 rounded-2xl border transition-all ${
        level === 0 ? "bg-primary text-primary-foreground border-primary font-bold text-center" : "bg-card border-border hover:border-primary/30"
      }`}>
        <span className={`text-sm ${level === 0 ? "font-bold" : "font-medium text-foreground"}`}>{node.title}</span>
      </div>
      {node.children?.map((child) => renderMindmapNode(child, level + 1))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/chat")} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground-muted" />
            </button>
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <div>
                <h1 className="font-bold text-sm text-foreground">Learning Lab</h1>
                <p className="text-[10px] text-foreground-muted">AI-powered study tools</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-foreground-muted" />
            <span className="text-[10px] text-foreground-muted font-medium">Multi-language</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Source Selection */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-foreground">Sumber Materi</h2>
            {uploadedFileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium truncate max-w-[150px]">{uploadedFileName}</span>
                <button onClick={() => { setUploadedContent(null); setUploadedFileName(null); setResult(null); }} className="p-0.5 rounded-full hover:bg-primary/20">
                  <X className="w-3 h-3 text-primary" />
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SOURCE_TYPES.map((source) => (
              <motion.button key={source.id} whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (source.id === "video") setShowVideoInput(true);
                  else if (source.id === "image") imageInputRef.current?.click();
                  else fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-accent/50 transition-all">
                {source.icon}
                <span className="text-xs font-bold text-foreground">{source.label}</span>
                <span className="text-[10px] text-foreground-muted text-center">{source.desc}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Video URL Input */}
        <AnimatePresence>
          {showVideoInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className="flex gap-2">
                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste YouTube URL..." className="flex-1 px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary/50" />
                <button onClick={handleVideoSubmit} className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Submit</button>
                <button onClick={() => setShowVideoInput(false)} className="p-3 rounded-xl hover:bg-accent"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Learning Mode */}
        <section className="mb-6">
          <h2 className="font-bold text-lg text-foreground mb-4">Mode Pembelajaran</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {STUDY_MODES.map((mode) => (
              <button key={mode.id} onClick={() => setActiveMode(mode.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                  activeMode === mode.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-card border border-border text-foreground hover:border-primary/30"
                }`}>
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tone & Style (only for summary) */}
        {activeMode === "summary" && (
          <section className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Tone & Style:</span>
              {TONE_OPTIONS.map((tone) => (
                <button key={tone.id} onClick={() => setToneStyle(tone.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    toneStyle === tone.id ? "bg-primary/15 text-primary border border-primary/30" : "text-foreground-muted hover:text-foreground hover:bg-accent"
                  }`}>
                  {tone.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Generate Button */}
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleGenerate} disabled={isProcessing || !uploadedContent}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm mb-8 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          {isProcessing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Menghasilkan...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Generate {STUDY_MODES.find(m => m.id === activeMode)?.label}</>
          )}
        </motion.button>

        {/* Results */}
        <AnimatePresence mode="wait">
          {/* Summary Result */}
          {result && activeMode === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-3xl p-6 mb-8">
              <MarkdownRenderer content={result} />
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <button onClick={handleGenerate} className="flex items-center gap-2 text-xs text-primary font-bold hover:underline">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate dengan tone berbeda
                </button>
              </div>
            </motion.div>
          )}

          {/* Mindmap Result */}
          {mindmapData && activeMode === "mindmap" && (
            <motion.div key="mindmap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-3xl p-6 mb-8 overflow-x-auto">
              {renderMindmapNode(mindmapData)}
            </motion.div>
          )}

          {/* Quiz Result */}
          {quizQuestions.length > 0 && activeMode === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-3xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-foreground-muted font-bold">Soal {currentQuiz + 1}/{quizQuestions.length}</span>
                <span className="text-xs font-bold text-primary">Skor: {quizScore}</span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5 mb-6">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${((currentQuiz + 1) / quizQuestions.length) * 100}%` }} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-6">{quizQuestions[currentQuiz]?.question}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {quizQuestions[currentQuiz]?.options.map((opt, i) => {
                  const isCorrect = i === quizQuestions[currentQuiz]?.correct;
                  const isSelected = selectedAnswer === i;
                  return (
                    <button key={i} onClick={() => selectedAnswer === null && handleQuizAnswer(i)} disabled={selectedAnswer !== null}
                      className={`px-4 py-4 rounded-2xl border-2 text-left text-sm font-medium transition-all flex items-center gap-3 ${
                        selectedAnswer !== null && isCorrect ? "border-green-500 bg-green-500/10 text-green-600"
                        : selectedAnswer !== null && isSelected && !isCorrect ? "border-red-500 bg-red-500/10 text-red-600"
                        : isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                      }`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        selectedAnswer !== null && isCorrect ? "bg-green-500 text-white" : isSelected ? "bg-primary text-primary-foreground" : "bg-accent text-foreground-muted"
                      }`}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== null && quizQuestions[currentQuiz]?.hint && (
                <p className="text-xs text-foreground-muted italic mb-4">💡 Hint: {quizQuestions[currentQuiz].hint}</p>
              )}
              {selectedAnswer !== null && currentQuiz < quizQuestions.length - 1 && (
                <button onClick={nextQuiz} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm float-right">Selanjutnya →</button>
              )}
              {selectedAnswer !== null && currentQuiz === quizQuestions.length - 1 && (
                <div className="text-center py-4">
                  <p className="text-lg font-bold text-foreground">🎉 Selesai! Skor: {quizScore}/{quizQuestions.length}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Flashcards Result */}
          {flashcards.length > 0 && activeMode === "flashcards" && (
            <motion.div key="flashcards" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8">
              <motion.div whileTap={{ scale: 0.98 }} onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                className="bg-primary rounded-3xl p-8 min-h-[250px] flex flex-col items-center justify-center cursor-pointer shadow-lg shadow-primary/20 mb-6">
                {!flashcardFlipped && <span className="text-[10px] text-primary-foreground/50 uppercase tracking-widest mb-4">Tap untuk flip</span>}
                <AnimatePresence mode="wait">
                  <motion.div key={flashcardFlipped ? "back" : "front"} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <p className="text-xl font-bold text-primary-foreground text-center">
                      {flashcardFlipped ? flashcards[currentFlashcard]?.back : flashcards[currentFlashcard]?.front}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-muted font-bold">{currentFlashcard + 1}/{flashcards.length}</span>
                <div className="flex gap-3">
                  <button onClick={() => { setCurrentFlashcard(prev => Math.max(0, prev - 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === 0}
                    className="px-5 py-3 rounded-xl bg-card border border-border text-sm font-bold disabled:opacity-30">← Prev</button>
                  <button onClick={() => { setCurrentFlashcard(prev => Math.min(flashcards.length - 1, prev + 1)); setFlashcardFlipped(false); }} disabled={currentFlashcard === flashcards.length - 1}
                    className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-30">Next →</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fallback text result for mindmap/quiz/flashcard parse failures */}
          {result && activeMode !== "summary" && (
            <motion.div key="fallback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-3xl p-6 mb-8">
              <MarkdownRenderer content={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFileUpload(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
    </div>
  );
};

export default StudyDashboard;
