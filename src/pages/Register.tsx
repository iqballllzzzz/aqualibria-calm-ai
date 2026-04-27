import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { registerWithEmail } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";
import ParticleBackground from "@/components/ParticleBackground";

type Step = "form" | "verify" | "done";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-gsap='reg-card']", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, [step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);

    // Step 1: Create account (won't auto-confirm)
    const result = await registerWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Step 2: Send OTP code to email for verification
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      // If OTP fails, still show verify step - user can use the confirmation email
      console.warn("OTP send failed:", otpError.message);
    }

    setStep("verify");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    setError("");

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message || "Invalid code. Please try again.");
      setLoading(false);
      return;
    }

    if (data.session) {
      setStep("done");
      setTimeout(() => navigate("/chat"), 1500);
    } else {
      // Try signing in with password since account exists
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Verification successful but login failed. Please go to login page.");
        setLoading(false);
        return;
      }
      setStep("done");
      setTimeout(() => navigate("/chat"), 1500);
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      setError("Failed to resend code: " + error.message);
    } else {
      setError("");
    }
    setLoading(false);
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <ParticleBackground color="#10b981" count={300} opacity={0.3} />
        <div className="spotlight spotlight-cyan" style={{ width: "40vw", height: "40vw", top: "10%", left: "20%" }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm text-center relative z-10 page-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-3xl bg-brand-gradient opacity-30 blur-xl" />
            <div className="relative w-20 h-20 rounded-3xl surface-glass flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Akun terverifikasi</h1>
          <p className="text-muted-foreground text-sm mb-6">Mengarahkan ke chat...</p>
          <div className="w-8 h-8 mx-auto border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <ParticleBackground color="#06b6d4" count={350} opacity={0.28} />
        <div className="spotlight spotlight-violet" style={{ width: "40vw", height: "40vw", top: "-10%", right: "-10%" }} />
        <div className="spotlight spotlight-cyan" style={{ width: "30vw", height: "30vw", bottom: "-10%", left: "-5%", opacity: 0.18 }} />
        <motion.div data-gsap="reg-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Verifikasi Email</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Masukkan kode 6 digit yang dikirim ke<br />
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex justify-center">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-48 px-4 py-4 rounded-2xl bg-card border-2 border-border text-foreground text-center text-2xl font-bold tracking-[0.5em] placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                maxLength={6}
                autoFocus
                required
              />
            </div>
            <button type="submit" disabled={loading || otpCode.length < 6} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : "Verifikasi"}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <button onClick={handleResendCode} disabled={loading} className="text-sm text-primary font-semibold hover:underline disabled:opacity-50">
              Kirim ulang kode
            </button>
            <p className="text-xs text-muted-foreground">
              Cek juga folder Spam / Junk di email kamu
            </p>
          </div>

          <button onClick={() => { setStep("form"); setError(""); }} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
            ← Kembali ke form registrasi
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <ParticleBackground color="#8b5cf6" count={350} opacity={0.28} />
      <div className="spotlight spotlight-violet" style={{ width: "42vw", height: "42vw", top: "-12%", right: "-8%" }} />
      <div className="spotlight spotlight-pink" style={{ width: "30vw", height: "30vw", bottom: "-12%", left: "-8%", opacity: 0.16 }} />

      <motion.div data-gsap="reg-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("register.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1.5">{t("register.subtitle")}</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("register.email")} className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("register.password")} className="w-full pl-11 pr-11 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("register.confirm")} className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? (<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Creating account...</span>) : t("register.create")}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          {t("register.hasAccount")}{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">{t("register.login")}</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
