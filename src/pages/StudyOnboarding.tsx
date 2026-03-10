import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

const AGE_OPTIONS = [
  { label: "12-", value: "12-", emoji: "🧒" },
  { label: "13+", value: "13+", emoji: "🧑" },
  { label: "18+", value: "18+", emoji: "🎓" },
];

const EDUCATION_OPTIONS = [
  { label: "SD", value: "sd", emoji: "📗", desc: "Sekolah Dasar" },
  { label: "SMP", value: "smp", emoji: "📘", desc: "Sekolah Menengah Pertama" },
  { label: "SMA", value: "sma", emoji: "📙", desc: "Sekolah Menengah Atas" },
  { label: "Kuliah", value: "kuliah", emoji: "🎓", desc: "Perguruan Tinggi" },
];

const StudyOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=welcome, 1=age, 2=education
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedEducation, setSelectedEducation] = useState<string | null>(null);

  const handleContinue = () => {
    if (step === 0) setStep(1);
    else if (step === 1 && selectedAge) setStep(2);
    else if (step === 2 && selectedEducation) {
      localStorage.setItem("aqua-study-profile", JSON.stringify({ age: selectedAge, education: selectedEducation }));
      navigate("/study/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: 'hsl(172, 66%, 40%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ background: 'hsl(36, 95%, 55%)' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-primary/15 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Halo, selamat datang pada Pembelajaran! 🎉</h1>
              <p className="text-foreground-muted text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                Disini AI akan mengajarkanmu semuanya yang kamu inginkan hingga sudah hebat. Sebelum itu, bisakah kamu memberitahu terlebih dahulu tentang dirimu?
              </p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleContinue} className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto shadow-lg shadow-primary/20">
                <span>Mulai</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="age" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Berapa usiamu?</h2>
              <p className="text-foreground-muted text-sm mb-8">Kami akan menyesuaikan konten pembelajaran untukmu</p>
              <div className="flex gap-3 justify-center mb-8">
                {AGE_OPTIONS.map((opt) => (
                  <motion.button key={opt.value} whileTap={{ scale: 0.95 }} onClick={() => setSelectedAge(opt.value)}
                    className={`flex-1 max-w-[120px] py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedAge === opt.value ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={`text-sm font-bold ${selectedAge === opt.value ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                  </motion.button>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleContinue} disabled={!selectedAge}
                className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
                <span>Lanjutkan</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="education" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <GraduationCap className="w-8 h-8 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Kamu sedang menduduki bangku apa?</h2>
              <p className="text-foreground-muted text-sm mb-8">Pilih jenjang pendidikanmu saat ini</p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {EDUCATION_OPTIONS.map((opt) => (
                  <motion.button key={opt.value} whileTap={{ scale: 0.95 }} onClick={() => setSelectedEducation(opt.value)}
                    className={`py-5 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedEducation === opt.value ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={`text-sm font-bold ${selectedEducation === opt.value ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                    <span className="text-[10px] text-foreground-muted">{opt.desc}</span>
                  </motion.button>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleContinue} disabled={!selectedEducation}
                className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
                <span>Lanjutkan</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${step === s ? "w-8 bg-primary" : step > s ? "w-4 bg-primary/40" : "w-4 bg-border"}`} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StudyOnboarding;
