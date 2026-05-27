import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ─── Global Fetch Interceptor for Tenant Context Persistence ─────────────────
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let activeTenantId: string | null = null;
  try {
    const raw = localStorage.getItem("vaxplan_active_tenant");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === "string") {
        activeTenantId = parsed.id;
      } else if (parsed && typeof parsed.id === "number") {
        activeTenantId = String(parsed.id);
      } else if (typeof parsed === "string") {
        activeTenantId = parsed;
      }
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }

  if (activeTenantId) {
    if (input instanceof Request) {
      if (!input.headers.has("x-tenant-id")) {
        input.headers.set("x-tenant-id", activeTenantId);
      }
    } else {
      init = init || {};
      const headers = new Headers(init.headers);
      if (!headers.has("x-tenant-id")) {
        headers.set("x-tenant-id", activeTenantId);
      }
      init.headers = headers;
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);

// ─── Register PWA Service Worker (production + staging only) ─────────────────
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.info("[VaxPlan SW] Registered:", reg.scope);
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available — page will use new SW on next reload
                console.info("[VaxPlan SW] Update available — reload to apply");
              }
            });
          }
        });
      })
      .catch((err) => console.warn("[VaxPlan SW] Registration failed:", err));
  });
}
