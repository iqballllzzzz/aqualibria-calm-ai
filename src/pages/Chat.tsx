import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Send,
  Menu,
  X,
  Image,
  FileText,
  Video,
  Settings as SettingsIcon,
  Search,
  Sparkles,
  Music,
  Quote,
  Moon,
  Sun,
  MessageSquare,
  Code,
  Globe,
  ChevronRight,
  Download,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { logOut } from "@/lib/firebase";
import {
  sendChatMessage,
  sendResearchQuery,
  generateImage,
  searchSpotify,
  ChatMessage,
  APIStatus,
  testAllAPIs,
} from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Chat: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [activeMode, setActiveMode] = useState<"chat" | "research" | "image" | "spotify">("chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Test APIs on mount
  useEffect(() => {
    const testAPIs = async () => {
      const status = await testAllAPIs();
      setApiStatus(status);
      
      // Notify about any failed APIs
      const failedAPIs: string[] = [];
      if (!status.chat) failedAPIs.push("Chat");
      if (!status.spotify) failedAPIs.push("Spotify");
      if (!status.imageGeneration) failedAPIs.push("Image Generation");
      
      if (failedAPIs.length > 0) {
        toast({
          title: "Some features unavailable",
          description: `${failedAPIs.join(", ")} API(s) are currently unavailable.`,
          variant: "destructive",
        });
      }
    };
    testAPIs();
  }, [toast]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      let result;

      switch (activeMode) {
        case "research":
          result = await sendResearchQuery(userMessage.content);
          break;
        case "image":
          result = await generateImage(userMessage.content);
          if (result.success && result.imageUrl) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Here's your generated image:",
                timestamp: new Date(),
                imageUrl: result.imageUrl,
              },
            ]);
            setIsLoading(false);
            setActiveMode("chat");
            return;
          }
          break;
        case "spotify":
          const spotifyResult = await searchSpotify(userMessage.content);
          if (spotifyResult.success) {
            const resultText = spotifyResult.results
              ?.slice(0, 5)
              .map((track: any, i: number) => `${i + 1}. ${track.name || track.title} - ${track.artist || track.artists?.join(", ")}`)
              .join("\n") || "No results found.";
            result = { success: true, response: `Spotify search results:\n\n${resultText}` };
          } else {
            result = spotifyResult;
          }
          break;
        default:
          result = await sendChatMessage(userMessage.content);
      }

      if (result.success && result.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.response,
            timestamp: new Date(),
          },
        ]);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to get response",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setActiveMode("chat");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = async () => {
    await logOut();
    navigate("/login");
  };

  const plusMenuItems = [
    { icon: Image, label: "Upload Image", disabled: true },
    { icon: Video, label: "Upload Video", disabled: true },
    { icon: FileText, label: "Upload File", disabled: true },
    { icon: SettingsIcon, label: "Choose Model", disabled: true },
    { 
      icon: Sparkles, 
      label: "Generate Image", 
      disabled: !apiStatus?.imageGeneration,
      onClick: () => { setActiveMode("image"); setShowPlusMenu(false); }
    },
    { 
      icon: Search, 
      label: "Deep Research", 
      disabled: !apiStatus?.research,
      onClick: () => { setActiveMode("research"); setShowPlusMenu(false); }
    },
    { 
      icon: Music, 
      label: "Spotify Search", 
      disabled: !apiStatus?.spotify,
      onClick: () => { setActiveMode("spotify"); setShowPlusMenu(false); }
    },
    { icon: Quote, label: "Quote Maker", disabled: true },
  ];

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            >
              <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
                    <span className="text-sm font-semibold text-sidebar-foreground">A</span>
                  </div>
                  <span className="font-medium text-sidebar-foreground">AquaLibriaAI</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                >
                  <X className="w-5 h-5 text-sidebar-foreground" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <MessageSquare className="w-5 h-5" />
                  <span>{t("menu.history")}</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <Search className="w-5 h-5" />
                  <span>{t("menu.search")}</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
                  <Code className="w-5 h-5" />
                  <span>{t("menu.coding")}</span>
                </button>
                
                {/* Language selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5" />
                      <span>{t("menu.language")}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showLanguageSelector ? "rotate-90" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showLanguageSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setLanguage(lang.code);
                                setShowLanguageSelector(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                language === lang.code
                                  ? "bg-sidebar-accent text-sidebar-foreground"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                              }`}
                            >
                              {lang.nativeName}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              <div className="p-3 border-t border-sidebar-border space-y-1">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{t("menu.theme")}</span>
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span>{t("menu.settings")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">A</span>
            </div>
            <span className="font-medium text-foreground text-sm">AquaLibriaAI</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-foreground" />
            )}
          </button>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center">
                    <span className="text-2xl font-semibold text-foreground">A</span>
                  </div>
                  <h2 className="text-xl font-medium text-foreground mb-2">
                    How can I help you today?
                  </h2>
                  <p className="text-foreground-muted">
                    Start a conversation or use the + menu for more options
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-chat-user text-foreground"
                          : "bg-chat-ai text-foreground border border-border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      
                      {message.imageUrl && (
                        <div className="mt-3">
                          <img
                            src={message.imageUrl}
                            alt="Generated"
                            className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setShowImageViewer(message.imageUrl!)}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />
                      <span className="text-foreground-muted text-sm">
                        {activeMode === "research" ? "Researching..." : 
                         activeMode === "image" ? "Generating image..." : 
                         "Thinking..."}
                      </span>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            {/* Active mode indicator */}
            {activeMode !== "chat" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 flex items-center gap-2"
              >
                <span className="text-xs text-foreground-muted px-2 py-1 rounded-md bg-accent">
                  {activeMode === "research" && "Deep Research Mode"}
                  {activeMode === "image" && "Image Generation Mode"}
                  {activeMode === "spotify" && "Spotify Search Mode"}
                </span>
                <button
                  onClick={() => setActiveMode("chat")}
                  className="text-xs text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </motion.div>
            )}
            
            <div className="relative flex items-end gap-2 bg-chat-input border border-border rounded-2xl p-2">
              {/* Plus button */}
              <div className="relative">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="p-2 rounded-xl hover:bg-accent transition-colors"
                >
                  <Plus className={`w-5 h-5 text-foreground-muted transition-transform ${showPlusMenu ? "rotate-45" : ""}`} />
                </button>

                <AnimatePresence>
                  {showPlusMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden"
                    >
                      {plusMenuItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            item.disabled
                              ? "text-foreground-muted/50 cursor-not-allowed"
                              : "text-foreground hover:bg-accent"
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                          {item.disabled && (
                            <span className="ml-auto text-xs text-foreground-muted">Soon</span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                rows={1}
                className="flex-1 bg-transparent text-foreground placeholder:text-foreground-muted resize-none focus:outline-none py-2 max-h-[200px]"
              />

              {/* Send button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image viewer modal */}
      <AnimatePresence>
        {showImageViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={() => setShowImageViewer(null)}
                className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <a
                href={showImageViewer}
                download="generated-image.png"
                className="p-3 rounded-xl bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <Download className="w-5 h-5 text-foreground" />
              </a>
            </div>
            <img
              src={showImageViewer}
              alt="Generated"
              className="max-w-full max-h-[80vh] rounded-2xl shadow-elevated"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
