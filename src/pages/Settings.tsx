import React, { useState } from "react";
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
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { logOut } from "@/lib/firebase";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [aiName, setAiName] = useState("AquaLibriaAI");
  const [personality, setPersonality] = useState("balanced");

  const handleLogout = async () => {
    await logOut();
    navigate("/login");
  };

  const personalities = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "balanced", label: "Balanced" },
    { id: "creative", label: "Creative" },
    { id: "concise", label: "Concise" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 sticky top-0 bg-background z-10">
        <button
          onClick={() => navigate("/chat")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="ml-4 text-lg font-medium text-foreground">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {/* AI Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            AI Settings
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* AI Name */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-foreground-muted" />
                <span className="font-medium text-foreground">AI Name</span>
              </div>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>

            {/* Personality */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-5 h-5 text-foreground-muted" />
                <span className="font-medium text-foreground">Personality</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {personalities.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      personality === p.id
                        ? "bg-foreground text-background"
                        : "bg-accent text-foreground hover:bg-accent/80"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Chat Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            Chat Management
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors border-b border-border">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">Export Chat History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">Import Chat History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            Appearance
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
                <span className="text-foreground">Theme</span>
              </div>
              <span className="text-foreground-muted capitalize">{theme}</span>
            </button>
          </div>
        </motion.section>

        {/* AI Memory */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            AI Memory
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-foreground-muted mb-4">
              AquaLibriaAI can remember your name, preferences, and habits to provide a more personalized experience.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Remember my name</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Remember preferences</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Remember writing style</span>
                <input type="checkbox" className="w-4 h-4 accent-foreground" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Privacy */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-4">
            Privacy
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-foreground-muted" />
                <span className="text-foreground">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-foreground-muted" />
            </button>
          </div>
        </motion.section>

        {/* Logout */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 transition-colors"
          >
            Sign Out
          </button>
        </motion.section>
      </main>
    </div>
  );
};

export default Settings;
