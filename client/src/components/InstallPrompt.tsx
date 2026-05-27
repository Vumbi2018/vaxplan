/**
 * PWA Install Prompt Component
 *
 * - On Windows (Chrome/Edge): detects `beforeinstallprompt` and shows
 *   a dismissible banner with a one-click install button.
 * - On Android (Chrome): same `beforeinstallprompt` API works identically.
 * - On iOS Safari: shows manual "Add to Home Screen" instructions.
 * - Dismissed state persisted in localStorage — never shown again after dismiss.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "vaxplan-pwa-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the prompt
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const iosDetected =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iosDetected);

    // Check if already installed (running in standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) return; // Already installed — don't show prompt

    if (iosDetected) {
      // On iOS, show manual instructions after a short delay
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Chrome/Edge on Windows and Android
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] animate-in slide-in-from-bottom-4 duration-300"
      role="banner"
      aria-label="Install VaxPlan app"
      data-testid="pwa-install-prompt"
    >
      <div className="bg-card border border-border shadow-2xl rounded-xl p-4 flex gap-3">
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {isIOS ? (
            <Smartphone className="h-5 w-5 text-primary" />
          ) : (
            <Monitor className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Install VaxPlan</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install VaxPlan as an app on your device.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Install as an app for faster access, offline support, and a full-screen experience.
            </p>
          )}
          {!isIOS && (
            <Button
              size="sm"
              className="mt-2 h-7 text-xs gap-1.5 font-semibold"
              onClick={handleInstall}
              data-testid="button-pwa-install"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </Button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Dismiss install prompt"
          data-testid="button-pwa-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
