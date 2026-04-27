import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code, BookOpen, Image, Quote, ArrowRight, Sparkles } from "lucide-react";
import { gsap } from "gsap";
import AOS from "aos";
import "aos/dist/aos.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { setWelcomeShown } from "@/lib/storage";
import Logo from "@/components/Logo";
import ParticleBackground from "@/components/ParticleBackground";

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

  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-gsap='hero-logo']", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
      gsap.from("[data-gsap='hero-cta']", {
        y: 16,
        opacity: 0,
        duration: 0.7,
        delay: 0.4,
        ease: "power3.out",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const greeting = t("welcome.greeting");
  const subtitle = t("welcome.subtitle");
  const fullText = `${greeting}. ${subtitle}`;

  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(() => setTypedText(fullText.slice(0, typedText.length + 1)), 30);
      return () => clearTimeout(timeout);
    } else {
      setTypingComplete(true);
      setTimeout(() => setShowCursor(false), 1000);
    }
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
    { id: "coding", icon: Code, label: t("intent.coding"), gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-500" },
    { id: "learning", icon: BookOpen, label: t("intent.learning"), gradient: "from-emerald-500/10 to-green-500/10", iconColor: "text-emerald-500" },
    { id: "images", icon: Image, label: t("intent.images"), gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-purple-500" },
    { id: "quotes", icon: Quote, label: t("intent.quotes"), gradient: "from-amber-500/10 to-orange-500/10", iconColor: "text-amber-500" },
  ];

  return (
    <div ref={heroRef} className="min-h-screen w-full flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <ParticleBackground color="#7c3aed" count={400} opacity={0.35} />
      {/* Ambient effects */}
      <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-[0.06] blur-[120px] pointer-events-none" style={{ background: 'hsl(217, 91%, 55%)' }} />
      <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] rounded-full opacity-[0.05] blur-[100px] pointer-events-none" style={{ background: 'hsl(280, 91%, 60%)' }} />

      <div className="w-full max-w-lg relative z-10">
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
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} data-gsap="hero-logo">
                <Logo size="xl" className="mx-auto mb-8" />
              </motion.div>

              <div className="min-h-[100px] flex items-center justify-center">
                <p className="text-xl md:text-2xl text-foreground leading-relaxed max-w-md font-medium">
                  {typedText}
                  {showCursor && <span className="typing-cursor" />}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: typingComplete ? 1 : 0, y: typingComplete ? 0 : 10 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                data-gsap="hero-cta"
              >
                <button
                  onClick={() => setShowIntentSelection(true)}
                  disabled={!typingComplete}
                  className="mt-8 btn-primary inline-flex items-center gap-2 disabled:opacity-0"
                >
                  {t("welcome.continue")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="intent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <Logo size="sm" />
              </div>
              <h2 className="text-xl md:text-2xl text-foreground font-bold mb-2">{t("intent.question")}</h2>
              <p className="text-foreground-muted text-sm mb-8">Pick one to get started, you can always change later</p>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {intents.map((intent, index) => (
                  <motion.button
                    key={intent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    onClick={() => handleIntentSelect(intent.id)}
                    className={`group p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all btn-press`}
                  >
                    <div className={`w-11 h-11 mx-auto mb-3 rounded-xl bg-gradient-to-br ${intent.gradient} flex items-center justify-center`}>
                      <intent.icon className={`w-5 h-5 ${intent.iconColor}`} />
                    </div>
                    <span className="text-foreground font-semibold text-sm">{intent.label}</span>
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
          className="mt-12 text-center text-xs text-muted-foreground"
        >
          <a
            href="/about.html"
            className="underline-offset-4 hover:underline hover:text-primary transition"
          >
            Tentang AqualibriaAI &amp; Muhammad Iqbal Sukarno
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
