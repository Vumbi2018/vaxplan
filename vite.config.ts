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
      // implements Background Sync for the offline outbox. VitePWA is
      // kept only for the web app manifest — its generated SW is
      // emitted under a non-conflicting filename and we do not register
      // it (injectRegister:false), so only our /sw.js takes the /
      // scope at runtime.
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: false,
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // Heavy mapping / geospatial libs
          if (
            id.includes("/leaflet/") ||
            id.includes("/react-leaflet/") ||
            id.includes("/@react-leaflet/") ||
            id.includes("/leaflet.markercluster/") ||
            id.includes("/leaflet-defaulticon-compatibility/")
          ) {
            return "vendor-leaflet";
          }
          if (
            id.includes("/georaster") ||
            id.includes("/geotiff") ||
            id.includes("/proj4")
          ) {
            return "vendor-georaster";
          }
          if (id.includes("/@turf/")) {
            return "vendor-turf";
          }

          // Charts
          if (
            id.includes("/recharts/") ||
            id.includes("/d3-") ||
            id.includes("/victory-vendor/")
          ) {
            return "vendor-charts";
          }

          // Document export libs (lazy-loaded callers + own chunk)
          if (id.includes("/xlsx/")) return "vendor-xlsx";
          if (id.includes("/docx/")) return "vendor-docx";
          if (id.includes("/pptxgenjs/")) return "vendor-pptx";
          if (id.includes("/jspdf") || id.includes("/html2canvas/")) {
            return "vendor-pdf";
          }

          // Radix UI primitives
          if (id.includes("/@radix-ui/")) {
            return "vendor-radix";
          }

          // Icons
          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }

          // Forms / validation
          if (
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/") ||
            id.includes("/zod/")
          ) {
            return "vendor-forms";
          }

          // React core & router / query
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/wouter/") ||
            id.includes("/@tanstack/react-query/")
          ) {
            return "vendor-react";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
