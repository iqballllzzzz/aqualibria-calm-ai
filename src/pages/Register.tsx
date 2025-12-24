import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { registerWithEmail, signInWithGoogle } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);

  const handleEmailRegister = async (e: React.FormEvent) => {
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
    } else {
      setVerificationSent(true);
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError("");

    const result = await signInWithGoogle();
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate("/welcome");
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t("register.verify")}
          </h1>
          <p className="text-foreground-muted mb-8 leading-relaxed">
            {t("register.verifyMessage")}
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3.5 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 transition-all btn-press"
          >
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo placeholder */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center">
            <span className="text-2xl font-semibold text-foreground">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t("register.title")}
          </h1>
          <p className="text-foreground-muted text-sm">
            {t("register.subtitle")}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Register form */}
        <form onSubmit={handleEmailRegister} className="space-y-4">
          {/* Email input */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.email")}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-background-elevated border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground/30 transition-colors"
              required
            />
          </div>

          {/* Password input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("register.password")}
              className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-background-elevated border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground/30 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm password input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("register.confirm")}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-background-elevated border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground/30 transition-colors"
              required
            />
          </div>

          {/* Create account button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-press"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              t("register.create")
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-foreground-muted">or</span>
          </div>
        </div>

        {/* Google sign up */}
        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-background-elevated border border-border text-foreground font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-press flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("register.google")}
        </button>

        {/* Login link */}
        <p className="mt-8 text-center text-sm text-foreground-muted">
          {t("register.hasAccount")}{" "}
          <Link
            to="/login"
            className="text-foreground font-medium hover:underline"
          >
            {t("register.login")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
