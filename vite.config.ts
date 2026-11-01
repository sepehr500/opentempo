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
      includeManifestIcons: false, // the globs below decide what is cached offline
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
          // Full bleed for Android's circle/squircle masks; the dots sit inside the 80% safe zone.
          { src: "icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          // Shape only, tinted by Android for themed icons.
          { src: "icon-monochrome-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
        // Long-press the home-screen icon.
        shortcuts: [
          { name: "voice", short_name: "voice", description: "Pick a sound", url: "/?tab=voice", icons: [{ src: "shortcut-voice.png", sizes: "96x96", type: "image/png" }] },
          { name: "presets", short_name: "presets", description: "Load a saved tempo", url: "/?tab=presets", icons: [{ src: "shortcut-presets.png", sizes: "96x96", type: "image/png" }] },
        ],
        // One metronome at a time: launching again refocuses the open window (see src/platform/launch.ts).
        launch_handler: { client_mode: ["focus-existing", "auto"] },
        dir: "ltr",
        prefer_related_applications: false,
        // Shown in Android's install sheet; not precached (the app doesn't need them offline).
        screenshots: [
          { src: "screenshots/unit.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Unit: tempo, beats, split and level" },
          { src: "screenshots/voice.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Voice: eight synthesised sounds" },
          { src: "screenshots/presets.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Presets: saved tempos" },
          { src: "screenshots/wide.png", sizes: "1280x800", type: "image/png", form_factor: "wide", label: "tempo on a desktop" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Install-time only (the OS fetches these when installing); the app never needs them offline.
        globIgnores: ["screenshots/**", "icon-maskable-*", "icon-monochrome-*", "shortcut-*"],
      },
    }),
  ],
  server: { host: true },
  // Full licence texts of bundled JS dependencies, served at /third-party-licenses.md (not precached).
  build: { license: { fileName: "third-party-licenses.md" } },
  worker: { format: "es" },
  test: { environment: "node" },
});
