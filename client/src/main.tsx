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
// Surface SW lifecycle to the rest of the app via window events so
// components like InstallPrompt can offer a "Reload to update" action,
// and the Background Sync handler can find a ready registration.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.info("[VaxPlan SW] Registered:", reg.scope);

        // If there is already a waiting worker on first load, surface it.
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(
            new CustomEvent("vaxplan:sw-update-ready", { detail: { registration: reg } }),
          );
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.info("[VaxPlan SW] Update installed — reload to apply");
              window.dispatchEvent(
                new CustomEvent("vaxplan:sw-update-ready", { detail: { registration: reg } }),
              );
            }
          });
        });
      })
      .catch((err) => console.warn("[VaxPlan SW] Registration failed:", err));

    // Reload once the new SW takes control after a SKIP_WAITING message.
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
