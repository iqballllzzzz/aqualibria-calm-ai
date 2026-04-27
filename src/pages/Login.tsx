import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Phone } from "lucide-react";
import { signInWithEmail, signInWithPhone, verifyPhoneOtp } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { logActivity } from "@/lib/activity";
import Logo from "@/components/Logo";
import ParticleBackground from "@/components/ParticleBackground";

type AuthMode = "email" | "phone";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-gsap='login-title']", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" });
      gsap.from("[data-gsap='login-card']", { y: 30, opacity: 0, duration: 0.9, delay: 0.1, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.user) {
      logActivity(result.user.uid, "login_email", { method: "email" }, result.user.email || undefined);
      navigate("/chat");
    }
  };

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signInWithPhone(phone);
    if (result.error) {
      setError(result.error);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await verifyPhoneOtp(phone, otp);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.user) {
      logActivity(result.user.uid, "login_phone", { method: "phone" }, result.user.email || undefined);
      navigate("/chat");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <ParticleBackground color="#7c3aed" count={350} opacity={0.3} />
      <div className="absolute top-[-30%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ background: 'hsl(var(--primary))' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8" data-gsap="login-title">
          <Logo size="lg" className="mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("login.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1.5">{t("login.subtitle")}</p>
        </div>

        {/* Auth mode tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-5">
          <button onClick={() => { setAuthMode("email"); setError(""); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Mail className="w-4 h-4" />Email
          </button>
          <button onClick={() => { setAuthMode("phone"); setError(""); setOtpSent(false); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Phone className="w-4 h-4" />Phone
          </button>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {authMode === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.email")} className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required />
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("login.password")} className="w-full pl-11 pr-11 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? (<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Signing in...</span>) : t("login.signin")}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? handlePhoneVerify : handlePhoneSendOtp} className="space-y-3">
            <div className="relative group">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62812345678" className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm" required disabled={otpSent} />
            </div>
            {otpSent && (
              <div className="relative group">
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP code" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm text-center tracking-widest" required maxLength={6} />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? (<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /></span>) : otpSent ? "Verify OTP" : "Send OTP"}
            </button>
            {otpSent && (
              <button type="button" onClick={() => setOtpSent(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">Change number</button>
            )}
          </form>
        )}

        <p className="mt-7 text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">{t("login.register")}</Link>
        </p>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/about.html" className="hover:text-primary hover:underline transition">Tentang</a>
          <span aria-hidden="true">·</span>
          <a
            href="https://www.linkedin.com/in/muhammad-iqbal-a54628400?utm_source=share_via&utm_content=profile&utm_medium=member_android"
            target="_blank"
            rel="noopener me author"
            className="inline-flex items-center gap-1 hover:text-primary transition"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM8 19H5V8h3v11zM6.5 6.7C5.5 6.7 4.7 5.9 4.7 4.9S5.5 3.1 6.5 3.1s1.8.8 1.8 1.8-.8 1.8-1.8 1.8zM20 19h-3v-5.6c0-1.3-.5-2.2-1.6-2.2-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.6 1.3 3.6 4.1V19z" />
            </svg>
            LinkedIn
          </a>
          <span aria-hidden="true">·</span>
          <Link to="/privacy" className="hover:text-primary hover:underline transition">Privasi</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
