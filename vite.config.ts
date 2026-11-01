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
        name: "tempo",
        short_name: "tempo",
        description: "A pocket metronome.",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F2F2EE",
        theme_color: "#F2F2EE",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  server: { host: true },
  // Full licence texts of bundled JS dependencies, served at /third-party-licenses.md (not precached).
  build: { license: { fileName: "third-party-licenses.md" } },
  worker: { format: "es" },
  test: { environment: "node" },
});
