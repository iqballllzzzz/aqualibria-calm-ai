import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        id: "/",
        name: "AquaLibriaAI",
        short_name: "AquaLibria",
        description: "Your calm, intelligent AI companion for thinking, coding, learning, and creating.",
        theme_color: "#7c3aed",
        background_color: "#121212",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        dir: "ltr",
        lang: "id",
        categories: ["productivity", "utilities", "education"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64",
            type: "image/x-icon",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "AquaLibriaAI - AI Companion",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "AquaLibriaAI - AI Companion",
          },
        ],
        shortcuts: [
          {
            name: "Chat Baru",
            short_name: "Chat",
            description: "Mulai percakapan baru dengan AI",
            url: "/chat",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Coding Partner",
            short_name: "Code",
            description: "Buka coding partner AI",
            url: "/coding",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
        ],
        launch_handler: {
          client_mode: "navigate-existing",
        },
        share_target: {
          action: "/chat",
          method: "GET",
          params: {
            text: "text",
          },
        },
      },
      workbox: {
        // Allow heavy lazy chunks (Monaco/Sandpack/xterm in /studio) to be precached.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.ryzumi\.vip\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
