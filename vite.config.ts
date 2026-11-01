/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    solid(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "tempo",
        short_name: "tempo",
        description: "A pocket metronome: tap tempo, accents, gap trainer, practice timer and presets. Works offline.",
        categories: ["music", "utilities", "education"],
        display: "standalone",
        orientation: "portrait",
        background_color: "#F2F2EE",
        theme_color: "#F2F2EE",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Shown in Android's install sheet; not precached (the app doesn't need them offline).
        screenshots: [
          { src: "screenshots/unit.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Unit: tempo, beats, split and level" },
          { src: "screenshots/voice.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Voice: eight synthesised sounds" },
          { src: "screenshots/presets.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Presets: saved tempos" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["screenshots/**"],
      },
    }),
  ],
  server: { host: true },
  // Full licence texts of bundled JS dependencies, served at /third-party-licenses.md (not precached).
  build: { license: { fileName: "third-party-licenses.md" } },
  worker: { format: "es" },
  test: { environment: "node" },
});
