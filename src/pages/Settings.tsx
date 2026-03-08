import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Brain, Download, Upload, Shield, Moon, Sun,
  ChevronRight, Save, LogOut, Globe, Crown, Archive, Search, Check,
  Edit2, Pin, Share2, Trash2, MessageSquare, AlertTriangle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { logOut } from "@/lib/firebase";
import {
  getPreferences, savePreferences, UserPreferences,
  getAIMemory, saveAIMemory, AIMemory,
  exportChatHistory, importChatHistory,
  getSubscription, canUseFeature, canUseModel, getModelUsage,
  getChatHistory, deleteChatSession, getChatManagement,
  togglePinSession, toggleArchiveSession, renameSession, ChatSession,
} from "@/lib/storage";
import { SUBSCRIPTION_PLANS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences());
  const [memory, setMemory] = useState<AIMemory>(getAIMemory());
  const [hasChanges, setHasChanges] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showEditPesan, setShowEditPesan] = useState(false);
  const [showHapusPesan, setShowHapusPesan] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [chatManagement, setChatManagement] = useState(getChatManagement());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [selectedDeleteSessions, setSelectedDeleteSessions] = useState<Set<string>>(new Set());

  const subscription = getSubscription();
  const usage = canUseFeature();
  const v2Usage = canUseModel("aqualibriav2");
  const v3Usage = canUseModel("aqualibriav3");
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  useEffect(() => { setPreferences(getPreferences()); setMemory(getAIMemory()); }, []);

  const refreshChats = () => { setChatHistory(getChatHistory()); setChatManagement(getChatManagement()); };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => { setPreferences(prev => ({ ...prev, [key]: value })); setHasChanges(true); };
  const handleMemoryChange = (key: keyof AIMemory, value: any) => { setMemory(prev => ({ ...prev, [key]: value })); setHasChanges(true); };

  const handleSave = () => { savePreferences(preferences); saveAIMemory(memory); setHasChanges(false); toast({ title: "Settings saved" }); };
  const handleLogout = async () => { await logOut(); navigate("/login"); };

  const handleExportChat = () => {
    const data = exportChatHistory();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "aqua-chat-history.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete" });
  };

  const handleImportChat = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { const success = importChatHistory(reader.result as string); toast({ title: success ? "Import complete" : "Import failed", variant: success ? "default" : "destructive" }); };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    setShowLanguageModal(false);
    toast({ title: "Language changed", description: `${languages.find(l => l.code === code)?.name}` });
  };

  const handleOpenEditPesan = () => {
    refreshChats();
    setShowEditPesan(true);
  };

  const handleDeleteChat = (id: string) => {
    deleteChatSession(id);
    refreshChats();
    toast({ title: "Chat deleted" });
  };

  const handlePinChat = (id: string) => {
    togglePinSession(id);
    refreshChats();
  };

  const handleArchiveChat = (id: string) => {
    toggleArchiveSession(id);
    refreshChats();
    toast({ title: "Chat archived" });
  };

  const handleRenameChat = (id: string) => {
    if (editTitle.trim()) {
      renameSession(id, editTitle.trim());
      refreshChats();
      setEditingId(null);
      setEditTitle("");
      toast({ title: "Renamed" });
    }
  };

  const handleShareChat = async (session: ChatSession) => {
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
        try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link disalin!" }); } catch { toast({ title: "Gagal menyalin", variant: "destructive" }); }
      } else {
        toast({ title: "Gagal membagikan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const filteredChats = chatHistory.filter(s =>
    s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const personalities = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
    { id: "concise", label: "Concise" },
  ];

  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();
  const userPhotoURL = user?.photoURL;
  const currentLanguage = languages.find(l => l.code === language);

  const Section = ({ children, title, delay = 0 }: { children: React.ReactNode; title: string; delay?: number }) => (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-3 px-1">{title}</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">{children}</div>
    </motion.section>
  );

  const SettingRow = ({ icon: Icon, label, onClick, right }: { icon: any; label: string; onClick?: () => void; right?: React.ReactNode }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-b-0">
      <Icon className="w-[18px] h-[18px] text-foreground-muted shrink-0" />
      <span className="flex-1 text-sm text-foreground font-medium">{label}</span>
      {right || <ChevronRight className="w-4 h-4 text-foreground-muted" />}
    </button>
  );

  return (
    <>
      <div className="h-screen-safe w-full bg-background flex flex-col overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-background">
          <button onClick={() => navigate("/chat")} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">{t("settings.title")}</h1>
          {hasChanges && (
            <button onClick={handleSave} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              <Save className="w-3.5 h-3.5" />Save
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-lg mx-auto p-5 space-y-6 pb-24">
            {/* Profile */}
            <Section title={t("settings.profile")} delay={0}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  {userPhotoURL ? (
                    <img src={userPhotoURL} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold">{userInitial}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{user?.displayName || user?.email || "User"}</p>
                    <p className="text-xs text-foreground-muted truncate">{user?.email}</p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      subscription.plan === "superior"
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                        : subscription.plan === "senior"
                        ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {currentPlan?.name || "Junior"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1.5 font-medium">Your Name</label>
                  <input type="text" value={memory.userName} onChange={(e) => handleMemoryChange("userName", e.target.value)} placeholder="Enter your name..." className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
              </div>
            </Section>

            {/* Usage Stats (Free users) */}
            {subscription.plan === "junior" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.03 }}>
                <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-3 px-1">Usage</h2>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground-muted">Chat (V1) today</span>
                    <span className="text-foreground font-medium">{typeof usage.remaining === 'number' ? usage.remaining : '∞'}/200</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground-muted">V2 Model (2 days)</span>
                    <span className="text-foreground font-medium">{v2Usage.remaining}/90</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground-muted">V3 Model (2 days)</span>
                    <span className="text-foreground font-medium">{v3Usage.remaining}/45</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Reset setiap pagi 00:00 WIB</p>

                  <button onClick={() => navigate("/chat")} className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <Crown className="w-4 h-4" />Upgrade Plan
                  </button>
                </div>
              </motion.div>
            )}

            {/* Appearance */}
            <Section title={t("settings.appearance") || "Appearance"} delay={0.05}>
              <SettingRow
                icon={theme === "dark" ? Moon : Sun}
                label={t("menu.theme")}
                onClick={toggleTheme}
                right={<span className="text-xs text-foreground-muted capitalize font-medium bg-accent px-2 py-1 rounded-lg">{theme}</span>}
              />
              <SettingRow
                icon={Globe}
                label={t("menu.language")}
                onClick={() => setShowLanguageModal(true)}
                right={
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-foreground-muted font-medium">{currentLanguage?.nativeName || "English"}</span>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                  </div>
                }
              />
            </Section>

            {/* AI Settings */}
            <Section title={t("settings.ai")} delay={0.1}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-2.5">
                  <Logo size="sm" />
                  <span className="font-semibold text-foreground text-sm">{t("settings.aiName")}</span>
                </div>
                <input type="text" value={preferences.aiName} onChange={(e) => handlePreferenceChange("aiName", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
              </div>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-2.5">
                  <Brain className="w-[18px] h-[18px] text-foreground-muted" />
                  <span className="font-semibold text-foreground text-sm">{t("settings.personality")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {personalities.map((p) => (
                    <button key={p.id} onClick={() => handlePreferenceChange("personality", p.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${preferences.personality === p.id ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/80"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <span className="font-semibold text-foreground text-sm mb-2 block">{t("settings.customPersonality")}</span>
                <textarea value={preferences.customPersonality} onChange={(e) => handlePreferenceChange("customPersonality", e.target.value)} placeholder={t("settings.customPersonalityPlaceholder")} rows={3} className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none" />
              </div>
            </Section>

            {/* Memory */}
            <Section title={t("settings.memory")} delay={0.15}>
              <div className="p-4 space-y-3">
                <p className="text-xs text-foreground-muted mb-1">{t("settings.memoryDesc") || "Control what AquaLibriaAI remembers about you."}</p>
                {[
                  { key: "rememberName" as const, label: t("settings.rememberName") },
                  { key: "rememberPreferences" as const, label: t("settings.rememberPrefs") },
                  { key: "rememberWritingStyle" as const, label: t("settings.rememberStyle") },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-foreground font-medium">{item.label}</span>
                    <div className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${preferences[item.key] ? "bg-primary" : "bg-accent"}`} onClick={() => handlePreferenceChange(item.key, !preferences[item.key])}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${preferences[item.key] ? "left-5 bg-primary-foreground" : "left-1 bg-foreground-muted"}`} />
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            {/* Chat Management */}
            <Section title={t("settings.chat")} delay={0.2}>
              <SettingRow icon={Trash2} label="Hapus Pesan" onClick={() => { refreshChats(); setShowHapusPesan(true); }} />
              <SettingRow icon={MessageSquare} label="Edit Pesan" onClick={handleOpenEditPesan} />
              <SettingRow icon={Download} label={t("settings.export")} onClick={handleExportChat} />
              <SettingRow icon={Upload} label={t("settings.import")} onClick={handleImportChat} />
            </Section>

            {/* Privacy */}
            <Section title={t("settings.privacy") || "Privacy"} delay={0.25}>
              <SettingRow icon={Shield} label={t("settings.privacyPolicy")} onClick={() => navigate("/privacy")} />
            </Section>

            {/* Logout */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
              <button onClick={handleLogout} className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" />
                {t("menu.logout")}
              </button>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Language Selection Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-md max-h-[80vh] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Select Language
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={languageSearch} onChange={(e) => setLanguageSearch(e.target.value)} placeholder="Search languages..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {filteredLanguages.map((lang) => (
                <button key={lang.code} onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full p-3 flex items-center justify-between rounded-xl transition-colors ${language === lang.code ? "bg-accent text-foreground" : "hover:bg-accent/50 text-foreground-muted"}`}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                  </div>
                  {language === lang.code && <div className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hapus Pesan Modal — Delete entire chat sessions */}
      <Dialog open={showHapusPesan} onOpenChange={(open) => { setShowHapusPesan(open); if (!open) setSelectedDeleteSessions(new Set()); }}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-background border-border p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="w-5 h-5 text-destructive" />
              Hapus Pesan
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder="Cari chat..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
            {selectedDeleteSessions.size > 0 && (
              <button onClick={() => {
                selectedDeleteSessions.forEach(id => deleteChatSession(id));
                refreshChats();
                toast({ title: `${selectedDeleteSessions.size} percakapan dihapus` });
                setSelectedDeleteSessions(new Set());
              }} className="px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold shrink-0">
                Hapus ({selectedDeleteSessions.size})
              </button>
            )}
          </div>

          <ScrollArea className="h-[calc(85vh-140px)] px-5 pb-5">
            {filteredChats.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Belum ada chat</p>
            ) : (
              <div className="space-y-1 pt-3">
                {filteredChats.map((session) => {
                  const isSelected = selectedDeleteSessions.has(session.id);
                  return (
                    <button key={session.id} onClick={() => {
                      setSelectedDeleteSessions(prev => {
                        const next = new Set(prev);
                        if (next.has(session.id)) next.delete(session.id); else next.add(session.id);
                        return next;
                      });
                    }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left ${isSelected ? "bg-destructive/10 border border-destructive/30" : "hover:bg-accent border border-transparent"}`}>
                      <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-destructive bg-destructive" : "border-border"}`}>
                        {isSelected && <Check className="w-3 h-3 text-destructive-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground font-medium truncate block">{session.title}</span>
                        <span className="text-[10px] text-muted-foreground">{session.messages.length} pesan · {new Date(session.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Pesan Modal — Full chat management */}
      <Dialog open={showEditPesan} onOpenChange={setShowEditPesan}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-background border-border p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Edit Pesan
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-5 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder="Cari chat..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
          </div>

          <ScrollArea className="h-[calc(85vh-140px)] px-5 pb-5">
            {filteredChats.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Belum ada chat</p>
            ) : (
              <div className="space-y-2 pt-3">
                {filteredChats.map((session) => {
                  const isPinned = chatManagement.pinnedSessions.includes(session.id);
                  const isArchived = chatManagement.archivedSessions.includes(session.id);
                  const isEditing = editingId === session.id;

                  return (
                    <div key={session.id} className={`rounded-2xl border transition-all ${isPinned ? "border-primary/30 bg-primary/5" : isArchived ? "border-border bg-muted/50 opacity-60" : "border-border bg-card"}`}>
                      {/* Title */}
                      <div className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameChat(session.id)} className="flex-1 text-sm text-foreground bg-background border border-border rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary/40" autoFocus />
                            <button onClick={() => handleRenameChat(session.id)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"><Check className="w-4 h-4 text-primary" /></button>
                            <button onClick={() => { setEditingId(null); setEditTitle(""); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isPinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                            {isArchived && <Archive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span className="text-sm text-foreground font-medium truncate flex-1">{session.title}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{new Date(session.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions row */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 px-3 pb-3">
                          <button onClick={() => { setEditingId(session.id); setEditTitle(session.title); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-foreground-muted hover:bg-accent hover:text-foreground transition-colors">
                            <Edit2 className="w-3.5 h-3.5" /> Rename
                          </button>
                          <button onClick={() => handlePinChat(session.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors ${isPinned ? "text-primary bg-primary/10" : "text-foreground-muted hover:bg-accent hover:text-foreground"}`}>
                            <Pin className="w-3.5 h-3.5" /> {isPinned ? "Unpin" : "Pin"}
                          </button>
                          <button onClick={() => handleArchiveChat(session.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-foreground-muted hover:bg-accent hover:text-foreground transition-colors">
                            <Archive className="w-3.5 h-3.5" /> {isArchived ? "Restore" : "Archive"}
                          </button>
                          <button onClick={() => handleShareChat(session)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-foreground-muted hover:bg-accent hover:text-foreground transition-colors">
                            <Share2 className="w-3.5 h-3.5" /> Share
                          </button>
                          <button onClick={() => handleDeleteChat(session.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors ml-auto">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;
