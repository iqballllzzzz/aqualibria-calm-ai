import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Public Lovable Cloud browser config. These values are safe in the client bundle;
// data is protected by RLS and function-side auth. Keeping this fallback prevents
// a production build from crashing with "supabaseUrl is required" when hosting
// env vars are accidentally removed.
const CLOUD_URL_FALLBACK = "https://awkolliegwmdgpklqqwr.supabase.co";
const CLOUD_PUBLISHABLE_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3a29sbGllZ3dtZGdwa2xxcXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDUzNDAsImV4cCI6MjA4MjI4MTM0MH0.joD5EDOl5-XpSyB6CyNmBDImfvZOxNuOzMhFhseStAU";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || CLOUD_URL_FALLBACK;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || CLOUD_PUBLISHABLE_KEY_FALLBACK;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
