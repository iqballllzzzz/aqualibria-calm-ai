import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, User, Settings as SettingsIcon, Download, Upload, 
  Shield, ChevronRight, Brain, LogOut, Moon, Sun, Crown, Archive, Globe, Search
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { logOut } from "@/lib/firebase";
import { 
  getPreferences, savePreferences, UserPreferences,
  getAIMemory, saveAIMemory, AIMemory,
  exportChatHistory, importChatHistory,
  getSubscription, canUseFeature, canUseModel,
} from "@/lib/storage";
import { SUBSCRIPTION_PLANS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade: () => void;
  onOpenArchivedChats?: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ isOpen, onClose, onOpenUpgrade, onOpenArchivedChats }) => {
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
  
  const subscription = getSubscription();
  const usage = canUseFeature();
  const v2Usage = canUseModel("aqualibriav2");
  const v3Usage = canUseModel("aqualibriav3");
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  useEffect(() => {
    if (isOpen) {
      setPreferences(getPreferences());
      setMemory(getAIMemory());
    }
  }, [isOpen]);

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
    onClose();
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

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    setShowLanguageModal(false);
    toast({ title: "Language changed", description: `Interface language set to ${languages.find(l => l.code === code)?.name}` });
  };

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const personalities = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
    { id: "concise", label: "Concise" },
  ];

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-sidebar border-sidebar-border">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 border-b border-sidebar-border">
              <SheetTitle className="text-left flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-12 h-12 rounded-full bg-accent flex items-center justify-center"
                  >
                    <User className="w-6 h-6 text-foreground-muted" />
                  </motion.div>
                  <div>
                    <p className="font-medium text-foreground">{memory.userName || user?.email || "User"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        subscription.plan === "superior" 
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                          : subscription.plan === "senior"
                          ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white"
                          : "bg-muted text-foreground-muted"
                      }`}>
                        {currentPlan?.name || "Junior"}
                      </span>
                      {usage.remaining !== "unlimited" && (
                        <span className="text-xs text-foreground-muted">
                          {usage.remaining} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hasChanges && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90"
                  >
                    Save
                  </motion.button>
                )}
              </SheetTitle>
            </SheetHeader>

            {/* Content */}
            <ScrollArea className="flex-1 custom-scrollbar">
              <div className="p-4 space-y-6">
                {/* Usage Stats for Free Users */}
                {subscription.plan === "junior" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-accent/50 space-y-3"
                  >
                    <h3 className="text-sm font-medium text-foreground">Usage Today</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground-muted">Chat (V1)</span>
                        <span className="text-foreground">{typeof usage.remaining === 'number' ? usage.remaining : 'unlimited'}/200</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground-muted">V2 Model (2 days)</span>
                        <span className="text-foreground">{v2Usage.remaining}/90</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground-muted">V3 Model (2 days)</span>
                        <span className="text-foreground">{v3Usage.remaining}/45</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Reset setiap pagi 00:00 WIB</p>
                  </motion.div>
                )}

                {/* Upgrade Plan Button */}
                {subscription.plan !== "superior" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { onClose(); onOpenUpgrade(); }}
                    className="w-full py-3 rounded-xl btn-gradient-purple flex items-center justify-center gap-2"
                  >
                    <Crown className="w-5 h-5" />
                    Upgrade Plan
                  </motion.button>
                )}

                {/* User Name */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Your Name</label>
                  <input
                    type="text"
                    value={memory.userName}
                    onChange={(e) => handleMemoryChange("userName", e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full px-4 py-2.5 rounded-lg bg-sidebar-accent border border-sidebar-border text-foreground focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Theme Toggle */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={toggleTheme}
                  className="w-full p-4 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      key={theme}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </motion.div>
                    <span className="text-foreground">{t("menu.theme")}</span>
                  </div>
                  <span className="text-foreground-muted capitalize">{theme}</span>
                </motion.button>

                {/* Language Selector */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowLanguageModal(true)}
                  className="w-full p-4 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5" />
                    <span className="text-foreground">{t("menu.language")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground-muted">{currentLanguage?.nativeName || "English"}</span>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                  </div>
                </motion.button>

                {/* AI Name */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">{t("settings.aiName")}</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
                    <Logo size="sm" />
                    <input
                      type="text"
                      value={preferences.aiName}
                      onChange={(e) => handlePreferenceChange("aiName", e.target.value)}
                      className="flex-1 bg-transparent text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {/* Personality */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">{t("settings.personality")}</label>
                  <div className="flex flex-wrap gap-2">
                    {personalities.map((p) => (
                      <motion.button
                        key={p.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePreferenceChange("personality", p.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          preferences.personality === p.id
                            ? "bg-foreground text-background"
                            : "bg-sidebar-accent text-foreground hover:bg-sidebar-accent/80"
                        }`}
                      >
                        {p.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">{t("settings.customPersonality")}</label>
                  <textarea
                    value={preferences.customPersonality}
                    onChange={(e) => handlePreferenceChange("customPersonality", e.target.value)}
                    placeholder={t("settings.customPersonalityPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-sidebar-accent border border-sidebar-border text-foreground focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Memory Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm">{t("settings.memory")}</span>
                  </div>
                  <div className="space-y-2 p-3 rounded-xl bg-sidebar-accent">
                    {[
                      { key: "rememberName", label: t("settings.rememberName") },
                      { key: "rememberPreferences", label: t("settings.rememberPrefs") },
                      { key: "rememberWritingStyle", label: t("settings.rememberStyle") },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer py-1">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <input 
                          type="checkbox" 
                          checked={preferences[item.key as keyof UserPreferences] as boolean}
                          onChange={(e) => handlePreferenceChange(item.key as keyof UserPreferences, e.target.checked)}
                          className="w-4 h-4 accent-purple-500 cursor-pointer" 
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Chat Management */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">{t("settings.chat")}</label>
                  <div className="space-y-2">
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleExportChat}
                      className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-foreground-muted" />
                        <span className="text-foreground">{t("settings.export")}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-foreground-muted" />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleImportChat}
                      className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-foreground-muted" />
                        <span className="text-foreground">{t("settings.import")}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-foreground-muted" />
                    </motion.button>
                    {onOpenArchivedChats && (
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { onOpenArchivedChats(); onClose(); }}
                        className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Archive className="w-5 h-5 text-foreground-muted" />
                          <span className="text-foreground">Archived Chats</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-foreground-muted" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Privacy */}
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-foreground-muted" />
                    <span className="text-foreground">{t("settings.privacyPolicy")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-foreground-muted" />
                </motion.button>
              </div>
            </ScrollArea>

            {/* Footer - Logout */}
            <div className="p-4 border-t border-sidebar-border">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                {t("menu.logout")}
              </motion.button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Language Selection Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-md max-h-[80vh] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Select Language
            </DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              placeholder="Search languages..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Language List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {filteredLanguages.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full p-3 flex items-center justify-between rounded-xl transition-colors ${
                    language === lang.code
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50 text-foreground-muted"
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                  </div>
                  {language === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-purple-500"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserPanel;
