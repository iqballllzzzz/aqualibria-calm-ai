import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { registerWithEmail } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";

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
      gsap.from("[data-gsap='reg-card']", {
        y: 22,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, [step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    const result = await registerWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      console.warn("OTP send failed:", otpError.message);
    }

    setStep("verify");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
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

  const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, hsl(var(--amber) / 0.08), transparent 55%), radial-gradient(ellipse at 10% 100%, hsl(var(--sage) / 0.06), transparent 55%)",
        }}
      />
      {children}
    </div>
  );

  const inputClass =
    "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-background-elevated border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-amber/50 focus:ring-2 focus:ring-amber/15 transition-all text-sm";

  if (step === "done") {
    return (
      <Backdrop>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-md text-center relative z-10 page-fade-in"
        >
          <div className="relative w-20 h-20 mx-auto mb-7">
            <div className="absolute inset-0 rounded-full bg-success/15 blur-xl" />
            <div className="relative w-20 h-20 rounded-full surface flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-success" strokeWidth={1.6} />
            </div>
          </div>
          <span className="divider-dot w-48 mx-auto mb-5">Verified</span>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight mb-3">
            Akun terverifikasi
          </h1>
          <p className="text-foreground-muted text-sm md:text-base mb-8">
            Mengarahkan ke chat…
          </p>
          <div className="w-7 h-7 mx-auto border-2 border-foreground/15 border-t-foreground rounded-full animate-spin" />
        </motion.div>
      </Backdrop>
    );
  }

  if (step === "verify") {
    return (
      <Backdrop>
        <motion.div
          data-gsap="reg-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-secondary flex items-center justify-center border border-border">
              <ShieldCheck className="w-7 h-7 text-amber" strokeWidth={1.5} />
            </div>
            <span className="divider-dot w-48 mx-auto mb-5">Verify your email</span>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
              Periksa kotak masuk
            </h1>
            <p className="text-foreground-muted text-sm md:text-base mt-3 leading-relaxed">
              Kami mengirim kode 6 digit ke
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-destructive/8 border border-destructive/20 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-center">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-56 px-4 py-4 rounded-2xl bg-background-elevated border border-border text-foreground text-center text-2xl font-serif font-medium tracking-[0.45em] placeholder:text-foreground-muted/30 focus:outline-none focus:border-amber/50 focus:ring-2 focus:ring-amber/15 transition-all"
                maxLength={6}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full btn-brand py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Verifikasi"
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={handleResendCode}
              disabled={loading}
              className="text-sm text-foreground font-medium underline-offset-4 hover:underline disabled:opacity-50"
            >
              Kirim ulang kode
            </button>
            <p className="text-xs text-foreground-muted">
              Cek juga folder Spam / Junk di email kamu
            </p>
          </div>

          <button
            onClick={() => {
              setStep("form");
              setError("");
            }}
            className="mt-6 w-full text-sm text-foreground-muted hover:text-foreground transition-colors text-center"
          >
            ← Kembali ke form registrasi
          </button>
        </motion.div>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <motion.div
        data-gsap="reg-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Logo size="md" className="mx-auto mb-6" />
          <span className="divider-dot w-48 mx-auto mb-5">Create your account</span>
          <h1 className="font-serif text-4xl text-foreground tracking-tight leading-[1.1]">
            {t("register.title")}
          </h1>
          <p className="text-foreground-muted text-sm md:text-base mt-3 max-w-sm mx-auto leading-relaxed">
            {t("register.subtitle")}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 rounded-2xl bg-destructive/8 border border-destructive/20 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div className="relative group">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground-muted group-focus-within:text-amber transition-colors"
              strokeWidth={1.6}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.email")}
              className={inputClass}
              required
            />
          </div>
          <div className="relative group">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground-muted group-focus-within:text-amber transition-colors"
              strokeWidth={1.6}
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("register.password")}
              className={`${inputClass} pr-11`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          <div className="relative group">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground-muted group-focus-within:text-amber transition-colors"
              strokeWidth={1.6}
            />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("register.confirm")}
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 btn-brand py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              t("register.create")
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-foreground-muted">
          {t("register.hasAccount")}{" "}
          <Link
            to="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline transition-colors"
          >
            {t("register.login")}
          </Link>
        </p>
      </motion.div>
    </Backdrop>
  );
};

export default Register;
