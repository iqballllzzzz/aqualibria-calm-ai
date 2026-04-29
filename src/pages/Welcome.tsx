import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code, BookOpen, Image, Quote, ArrowRight } from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { setWelcomeShown } from "@/lib/storage";
import Logo from "@/components/Logo";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showIntentSelection, setShowIntentSelection] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 40 });
  }, []);

  const greeting = t("welcome.greeting");
  const subtitle = t("welcome.subtitle");
  const fullText = `${greeting}. ${subtitle}`;

  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(
        () => setTypedText(fullText.slice(0, typedText.length + 1)),
        28,
      );
      return () => clearTimeout(timeout);
    }
    setTypingComplete(true);
    const t2 = setTimeout(() => setShowCursor(false), 1200);
    return () => clearTimeout(t2);
  }, [typedText, fullText]);

  useEffect(() => {
    if (!typingComplete) {
      const interval = setInterval(() => setShowCursor((prev) => !prev), 530);
      return () => clearInterval(interval);
    }
  }, [typingComplete]);

  const handleIntentSelect = (intent: string) => {
    localStorage.setItem("aqua-user-intent", intent);
    setWelcomeShown();
    navigate("/chat");
  };

  const intents = [
    { id: "coding", icon: Code, label: t("intent.coding") },
    { id: "learning", icon: BookOpen, label: t("intent.learning") },
    { id: "images", icon: Image, label: t("intent.images") },
    { id: "quotes", icon: Quote, label: t("intent.quotes") },
  ];

  return (
    <div
      ref={heroRef}
      className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 relative overflow-hidden bg-paper"
    >
      {/* very subtle warm wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, hsl(var(--amber) / 0.07), transparent 60%), radial-gradient(ellipse at 80% 90%, hsl(var(--sage) / 0.05), transparent 55%)",
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {!showIntentSelection ? (
            <motion.div
              key="greeting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex flex-col items-center gap-4"
              >
                <Logo size="lg" />
                <span
                  className="divider-dot w-56 mx-auto text-foreground-muted"
                >
                  AqualibriaAI
                </span>
              </motion.div>

              <div className="mt-12 min-h-[120px] flex items-center justify-center">
                <p className="font-serif text-3xl md:text-4xl text-foreground leading-[1.25] max-w-xl tracking-tight">
                  {typedText}
                  {showCursor && <span className="typing-cursor" />}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: typingComplete ? 1 : 0,
                  y: typingComplete ? 0 : 8,
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <button
                  onClick={() => setShowIntentSelection(true)}
                  disabled={!typingComplete}
                  className="mt-12 btn-brand disabled:opacity-0 group"
                >
                  <span>{t("welcome.continue")}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="intent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <span className="divider-dot w-56 mx-auto mb-6">Choose your path</span>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mb-3">
                {t("intent.question")}
              </h2>
              <p className="text-foreground-muted text-sm md:text-base mb-12 max-w-md mx-auto leading-relaxed">
                Pick one to get started. You can always change it later.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {intents.map((intent, index) => (
                  <motion.button
                    key={intent.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.07,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleIntentSelect(intent.id)}
                    className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-background-elevated border border-border hover:border-amber/40 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center transition-colors group-hover:bg-amber/10">
                      <intent.icon
                        className="w-5 h-5 text-foreground-secondary transition-colors group-hover:text-amber"
                        strokeWidth={1.4}
                      />
                    </div>
                    <span className="text-foreground font-medium text-sm tracking-tight">
                      {intent.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crawlable about link for Googlebot + users */}
        <div
          data-aos="fade-up"
          data-aos-delay="600"
          className="mt-20 text-center text-xs text-foreground-muted tracking-widest uppercase"
        >
          <a
            href="/about.html"
            className="underline-offset-4 hover:underline hover:text-foreground transition-colors"
          >
            About AqualibriaAI &amp; Muhammad Iqbal Sukarno
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
