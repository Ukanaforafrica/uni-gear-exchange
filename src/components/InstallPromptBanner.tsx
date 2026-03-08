import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPromptBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if user previously dismissed
    const prevDismissed = localStorage.getItem("pwa_install_dismissed");
    if (prevDismissed) {
      const dismissedAt = parseInt(prevDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (isStandalone || dismissed) return null;

  // Show iOS-specific instructions
  if (isIos) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom animate-in slide-in-from-bottom">
        <div className="mx-3 mb-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install barndle' hotmarket</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap the <span className="font-medium">Share</span> button, then <span className="font-medium">"Add to Home Screen"</span> for the best experience.
              </p>
            </div>
            <button onClick={handleDismiss} className="flex-shrink-0 p-1 rounded-full hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show Android/Chrome install prompt
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom animate-in slide-in-from-bottom">
      <div className="mx-3 mb-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install the app</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get notifications & quick access from your home screen.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDismiss} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
              Later
            </button>
            <Button size="sm" className="text-xs h-8 rounded-lg" onClick={handleInstall}>
              Install
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPromptBanner;
