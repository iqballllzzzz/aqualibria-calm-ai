import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Brain,
  Download,
  Upload,
  Shield,
  Moon,
  Sun,
  ChevronRight,
  Save,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { logOut } from "@/lib/firebase";
import { 
  getPreferences, 
  savePreferences, 
  UserPreferences,
  getAIMemory,
  saveAIMemory,
  AIMemory,
  exportChatHistory,
  importChatHistory,
} from "@/lib/storage";
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

  useEffect(() => {
    const storedPrefs = getPreferences();
    const storedMem = getAIMemory();
    setPreferences(storedPrefs);
    setMemory(storedMem);
  }, []);

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleMemoryChange = (key: keyof AIMemory, value: any) => {
    setMemory(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePreferences(preferences);
    saveAIMemory(memory);
    setHasChanges(false);
    toast({ title: "Settings saved", description: "Your preferences have been updated" });
  };

  const handleLogout = async () => {
    await logOut();
    navigate("/login");
  };

  const handleExportChat = () => {
    const data = exportChatHistory();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aqua-chat-history.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: "Chat history downloaded" });
  };

  const handleImportChat = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const success = importChatHistory(reader.result as string);
        if (success) {
          toast({ title: "Import complete", description: "Chat history imported successfully" });
        } else {
          toast({ title: "Import failed", description: "Invalid file format", variant: "destructive" });
        }
      };
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

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 sticky top-0 bg-background z-10">
        <button
          onClick={() => navigate("/chat")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="ml-4 text-lg font-medium text-foreground">{t("settings.title")}</h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm">Save</span>
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 pb-24">
        {/* User Profile */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.profile")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <User className="w-8 h-8 text-foreground-muted" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{user?.email || "User"}</p>
                <p className="text-sm text-foreground-muted">
                  {memory.userName ? `Known as: ${memory.userName}` : "Name not set"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-foreground-muted mb-2">Your Name</label>
              <input
                type="text"
                value={memory.userName}
                onChange={(e) => handleMemoryChange("userName", e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
          </div>
        </motion.section>

        {/* AI Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.ai")}
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* AI Name */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <Logo size="sm" />
                <span className="font-medium text-foreground">{t("settings.aiName")}</span>
              </div>
              <input
                type="text"
                value={preferences.aiName}
                onChange={(e) => handlePreferenceChange("aiName", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>

            {/* Personality */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-5 h-5 text-foreground-muted" />
                <span className="font-medium text-foreground">{t("settings.personality")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {personalities.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePreferenceChange("personality", p.id)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      preferences.personality === p.id
                        ? "bg-foreground text-background"
                        : "bg-accent text-foreground hover:bg-accent/80"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Personality */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-medium text-foreground">{t("settings.customPersonality")}</span>
              </div>
              <textarea
                value={preferences.customPersonality}
                onChange={(e) => handlePreferenceChange("customPersonality", e.target.value)}
                placeholder={t("settings.customPersonalityPlaceholder")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-foreground/30 transition-colors resize-none"
              />
              <p className="mt-2 text-xs text-foreground-muted">
                Custom instructions are temporary and won't override the AI's core personality.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Chat Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.chat")}
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button 
              onClick={handleExportChat}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">{t("settings.export")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
            <button 
              onClick={handleImportChat}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">{t("settings.import")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.appearance")}
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={toggleTheme}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-foreground-muted" />
                ) : (
                  <Sun className="w-5 h-5 text-foreground-muted" />
                )}
                <span className="text-foreground">{t("menu.theme")}</span>
              </div>
              <span className="text-foreground-muted capitalize">{theme}</span>
            </button>
          </div>
        </motion.section>

        {/* AI Memory */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.memory")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-foreground-muted mb-4">
              {t("settings.memoryDesc")}
            </p>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">{t("settings.rememberName")}</span>
                <input 
                  type="checkbox" 
                  checked={preferences.rememberName}
                  onChange={(e) => handlePreferenceChange("rememberName", e.target.checked)}
                  className="w-5 h-5 accent-foreground cursor-pointer" 
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">{t("settings.rememberPrefs")}</span>
                <input 
                  type="checkbox" 
                  checked={preferences.rememberPreferences}
                  onChange={(e) => handlePreferenceChange("rememberPreferences", e.target.checked)}
                  className="w-5 h-5 accent-foreground cursor-pointer" 
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">{t("settings.rememberStyle")}</span>
                <input 
                  type="checkbox" 
                  checked={preferences.rememberWritingStyle}
                  onChange={(e) => handlePreferenceChange("rememberWritingStyle", e.target.checked)}
                  className="w-5 h-5 accent-foreground cursor-pointer" 
                />
              </label>
            </div>
          </div>
        </motion.section>

        {/* Privacy */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            {t("settings.privacy")}
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">{t("settings.privacyPolicy")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>
        </motion.section>

        {/* Logout */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors"
          >
            {t("menu.logout")}
          </button>
        </motion.section>
      </main>
    </div>
  );
};

export default Settings;