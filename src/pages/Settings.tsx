import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Brain, Download, Upload, Shield, Moon, Sun, ChevronRight, Save, LogOut } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { logOut } from "@/lib/firebase";
import { getPreferences, savePreferences, UserPreferences, getAIMemory, saveAIMemory, AIMemory, exportChatHistory, importChatHistory } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences());
  const [memory, setMemory] = useState<AIMemory>(getAIMemory());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { setPreferences(getPreferences()); setMemory(getAIMemory()); }, []);

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

  const personalities = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
    { id: "concise", label: "Concise" },
  ];

  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();
  const userPhotoURL = user?.photoURL;

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
                </div>
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1.5 font-medium">Your Name</label>
                <input type="text" value={memory.userName} onChange={(e) => handleMemoryChange("userName", e.target.value)} placeholder="Enter your name..." className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
              </div>
            </div>
          </Section>

          {/* AI Settings */}
          <Section title={t("settings.ai")} delay={0.05}>
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

          {/* Chat */}
          <Section title={t("settings.chat")} delay={0.1}>
            <SettingRow icon={Download} label={t("settings.export")} onClick={handleExportChat} />
            <SettingRow icon={Upload} label={t("settings.import")} onClick={handleImportChat} />
          </Section>

          {/* Appearance */}
          <Section title={t("settings.appearance")} delay={0.15}>
            <SettingRow icon={theme === "dark" ? Moon : Sun} label={t("menu.theme")} onClick={toggleTheme} right={<span className="text-xs text-foreground-muted capitalize font-medium bg-accent px-2 py-1 rounded-lg">{theme}</span>} />
          </Section>

          {/* Memory */}
          <Section title={t("settings.memory")} delay={0.2}>
            <div className="p-4 space-y-3">
              <p className="text-xs text-foreground-muted mb-1">{t("settings.memoryDesc")}</p>
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

          {/* Privacy */}
          <Section title={t("settings.privacy")} delay={0.25}>
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
  );
};

export default Settings;
