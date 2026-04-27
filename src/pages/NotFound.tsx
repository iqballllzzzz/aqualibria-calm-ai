import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Compass } from "lucide-react";
import PageShell from "@/components/PageShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <PageShell withSpotlights padding="md">
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-md w-full"
        >
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-3xl bg-brand-gradient opacity-20 blur-2xl" />
            <div className="relative w-28 h-28 rounded-3xl surface-glass flex items-center justify-center">
              <span className="text-5xl font-display font-bold text-brand-gradient tracking-tight">
                404
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-display font-bold tracking-tight mb-3">
            Halaman tidak ditemukan
          </h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Rute <code className="font-mono-display text-foreground/80">{location.pathname}</code>{" "}
            tidak ada atau sudah dipindah. Yuk balik ke jalur utama.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="btn-brand">
              <Home className="w-4 h-4" />
              Beranda
            </Link>
            <Link to="/chat" className="btn-outline-soft">
              <Compass className="w-4 h-4" />
              Buka Chat
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn-outline-soft"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            <Link to="/about.html" className="hover:text-foreground transition">
              Tentang AqualibriaAI
            </Link>
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default NotFound;
