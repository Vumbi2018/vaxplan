import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // ─── Progressive Web App / Service Worker ─────────────────────────────
    VitePWA({
      // We ship a hand-written Service Worker (client/public/sw.js) that
      // implements Background Sync for the offline outbox. Disable
      // VitePWA's generated SW so it does not overwrite ours; keep the
      // manifest for installability.
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: false,
      srcDir: undefined,
      filename: "_vite-pwa-sw.js",
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12 MB to support large Leaflet/GIS modules
        // Cache the app shell (JS/CSS/fonts/HTML)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Runtime caching strategies
        runtimeCaching: [
          // API GET requests — NetworkFirst (5s timeout → fallback to cache)
          {
            urlPattern: /^https?:\/\/.*\/api\/(?!sync\/).*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Leaflet / OpenStreetMap tiles — CacheFirst (offline maps)
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Stamen / CartoDB tiles
          {
            urlPattern: /^https:\/\/(a|b|c)\.basemaps\.cartocdn\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-carto",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          // Google Fonts files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],

        // Don't cache /api/sync/* — always live
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "VaxPlan · Health Microplanning",
        short_name: "VaxPlan",
        description:
          "Multi-tenant GIS microplanning for national immunization and primary-care programmes. Works offline.",
        theme_color: "#1a56db",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["health", "medical", "productivity"],
        icons: [
          { src: "/icons/icon-192.png",        sizes: "192x192",  type: "image/png" },
          { src: "/icons/icon-512.png",        sizes: "512x512",  type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [],
        shortcuts: [
          {
            name: "Client Logbook",
            short_name: "Logbook",
            url: "/clients",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Session Planning",
            short_name: "Sessions",
            url: "/sessions",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      devOptions: {
        enabled: false, // keep HMR clean in dev; SW only active in production build
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
