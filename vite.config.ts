import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "package.json"), "utf8")) as { version: string };
const BUILD_TIME = new Date().toISOString();

// When building the packaged native shells (Android/Windows) we set
// VITE_NATIVE_BUILD=1. Those shells load the UI from local files, so assets
// must use relative paths ("./assets/...") — an absolute "/assets/..." path
// resolves to the filesystem root under Electron's file:// and produces a
// blank window. The web build keeps an absolute "/" base so SPA deep links
// work when served from the server.
const isNativeBuild = !!process.env.VITE_NATIVE_BUILD;

export default defineConfig({
  base: isNativeBuild ? "./" : "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    // Baked-in server address for packaged native apps (empty on the web,
    // where requests stay relative/same-origin).
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      process.env.VITE_API_BASE_URL ?? "",
    ),
  },
  plugins: [
    react(),
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
          // Esri ArcGIS Satellite & Transportation Tiles
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-esri",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // WorldPop WMS Geoserver layers
          {
            urlPattern: /^https:\/\/ogc\.worldpop\.org\/geoserver\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-worldpop",
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
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    // Force a single React instance — react-leaflet (and other React-consuming
    // libs in optimizeDeps) must share the app's React or you get "Invalid
    // hook call" / "more than one copy of React" at runtime in dev.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    // NOTE: do NOT add a `manualChunks` function here. Hand-rolled chunk
    // groups for React + react-leaflet + leaflet kept producing circular
    // imports between the resulting chunks (vendor-react ⇄ vendor-leaflet),
    // which left `React.createContext` undefined at load time and gave a
    // blank production screen. Rollup's automatic splitting handles the
    // dependency graph correctly; leave it alone unless you have a verified
    // reason and have re-tested the production build.
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
