import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, User, Settings as SettingsIcon, Download, Upload, 
  Shield, ChevronRight, Brain, LogOut, Moon, Sun, Crown, Archive, RotateCcw, Trash2
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { logOut } from "@/lib/firebase";
import { 
  getPreferences, savePreferences, UserPreferences,
  getAIMemory, saveAIMemory, AIMemory,
  exportChatHistory, importChatHistory,
  getSubscription, canUseFeature,
  ChatSession, getChatHistory, saveChatSession, deleteChatSession
} from "@/lib/storage";
import { SUBSCRIPTION_PLANS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ isOpen, onClose, onOpenUpgrade }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences());
  const [memory, setMemory] = useState<AIMemory>(getAIMemory());
  const [hasChanges, setHasChanges] = useState(false);
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>([]);
  
  const subscription = getSubscription();
  const usage = canUseFeature();
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan);

  useEffect(() => {
    if (isOpen) {
      setPreferences(getPreferences());
      setMemory(getAIMemory());
      loadArchivedSessions();
    }
  }, [isOpen]);

  const loadArchivedSessions = () => {
    const allSessions = getChatHistory();
    setArchivedSessions(allSessions.filter(s => s.isArchived));
  };

  const handleUnarchive = (session: ChatSession) => {
    saveChatSession({ ...session, isArchived: false });
    loadArchivedSessions();
    toast({ title: "Chat Unarchived" });
  };

  const handleDeleteArchived = (sessionId: string) => {
    deleteChatSession(sessionId);
    loadArchivedSessions();
    toast({ title: "Chat Deleted" });
  };

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

  const personalities = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
    { id: "concise", label: "Concise" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-sidebar border-sidebar-border">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-sidebar-border">
            <SheetTitle className="text-left flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-6 h-6 text-foreground-muted" />
                </div>
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
                        {usage.remaining} left today
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90"
                >
                  Save
                </button>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {/* Upgrade Plan Button */}
            {subscription.plan !== "superior" && (
              <button
                onClick={() => { onClose(); onOpenUpgrade(); }}
                className="w-full py-3 rounded-xl btn-gradient-purple flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                Upgrade Plan
              </button>
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
            <button
              onClick={toggleTheme}
              className="w-full p-4 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span className="text-foreground">{t("menu.theme")}</span>
              </div>
              <span className="text-foreground-muted capitalize">{theme}</span>
            </button>

            {/* Archived Chats Section */}
            <div className="space-y-2">
               <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="archived" className="border-sidebar-border">
                  <AccordionTrigger className="hover:no-underline p-4 bg-sidebar-accent rounded-xl">
                    <div className="flex items-center gap-3">
                      <Archive className="w-5 h-5 text-foreground-muted" />
                      <span className="text-foreground">Archived Chats</span>
                      <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full text-foreground-muted">
                        {archivedSessions.length}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ScrollArea className="h-[200px] w-full rounded-md border border-sidebar-border p-2">
                      {archivedSessions.length === 0 ? (
                        <p className="text-center text-sm text-foreground-muted py-4">No archived chats.</p>
                      ) : (
                        <div className="space-y-2">
                          {archivedSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent/50 group">
                              <span className="text-sm text-foreground truncate max-w-[180px]">{session.title}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleUnarchive(session)}
                                  className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground"
                                  title="Unarchive"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteArchived(session.id)}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

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
                  <button
                    key={p.id}
                    onClick={() => handlePreferenceChange("personality", p.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      preferences.personality === p.id
                        ? "bg-foreground text-background"
                        : "bg-sidebar-accent text-foreground hover:bg-sidebar-accent/80"
                    }`}
                  >
                    {p.label}
                  </button>
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
                <button 
                  onClick={handleExportChat}
                  className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-foreground-muted" />
                    <span className="text-foreground">{t("settings.export")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-foreground-muted" />
                </button>
                <button 
                  onClick={handleImportChat}
                  className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-foreground-muted" />
                    <span className="text-foreground">{t("settings.import")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-foreground-muted" />
                </button>
              </div>
            </div>

            {/* Privacy */}
            <button className="w-full p-3 flex items-center justify-between rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">{t("settings.privacyPolicy")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>

          {/* Footer - Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {t("menu.logout")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserPanel;
