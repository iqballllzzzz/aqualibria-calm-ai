import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code, BookOpen, Image, Quote, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showIntentSelection, setShowIntentSelection] = useState(false);

  const greeting = t("welcome.greeting");
  const subtitle = t("welcome.subtitle");
  const fullText = `${greeting}. ${subtitle}`;

  // Typing animation
  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }, 35); // Slow typing speed for calm effect
      return () => clearTimeout(timeout);
    } else {
      setTypingComplete(true);
      // Stop cursor blinking after typing is complete
      setTimeout(() => setShowCursor(false), 1000);
    }
  }, [typedText, fullText]);

  // Cursor blinking
  useEffect(() => {
    if (!typingComplete) {
      const interval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
  }, [typingComplete]);

  const handleContinue = () => {
    setShowIntentSelection(true);
  };

  const handleIntentSelect = (intent: string) => {
    // Store the selected intent
    localStorage.setItem("aqua-user-intent", intent);
    navigate("/chat");
  };

  const intents = [
    { id: "coding", icon: Code, label: t("intent.coding") },
    { id: "learning", icon: BookOpen, label: t("intent.learning") },
    { id: "images", icon: Image, label: t("intent.images") },
    { id: "quotes", icon: Quote, label: t("intent.quotes") },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {!showIntentSelection ? (
            <motion.div
              key="greeting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Logo size="xl" className="mx-auto mb-10" />
              </motion.div>

              {/* Typing text */}
              <div className="min-h-[120px] flex items-center justify-center">
                <p className="text-xl md:text-2xl text-foreground leading-relaxed max-w-lg">
                  {typedText}
                  {showCursor && (
                    <span className="inline-block w-0.5 h-6 md:h-7 bg-foreground ml-1 align-middle" />
                  )}
                </p>
              </div>

              {/* Continue button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: typingComplete ? 1 : 0, y: typingComplete ? 0 : 10 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <button
                  onClick={handleContinue}
                  disabled={!typingComplete}
                  className="mt-8 px-8 py-3.5 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 disabled:opacity-0 transition-all btn-press inline-flex items-center gap-2"
                >
                  {t("welcome.continue")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="intent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Logo */}
              <Logo size="lg" className="mx-auto mb-8" />

              <h2 className="text-xl md:text-2xl text-foreground mb-10">
                {t("intent.question")}
              </h2>

              {/* Intent options */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {intents.map((intent, index) => (
                  <motion.button
                    key={intent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    onClick={() => handleIntentSelect(intent.id)}
                    className="group p-6 rounded-2xl bg-background-elevated border border-border hover:border-foreground/20 transition-all btn-press"
                  >
                    <intent.icon className="w-7 h-7 mx-auto mb-3 text-foreground-muted group-hover:text-foreground transition-colors" />
                    <span className="text-foreground font-medium">
                      {intent.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Welcome;
