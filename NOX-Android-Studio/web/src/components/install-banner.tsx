import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const dismissed = useAppStore((s) => s.installDismissed);
  const dismiss = useAppStore((s) => s.dismissInstall);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(media.matches || nav.standalone === true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || standalone) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setDeferred(null);
  }

  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Download className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold tracking-tight">
            Auf den Startbildschirm
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            NOX wie eine echte App auf Android oder iPhone speichern. Läuft danach
            offline und deine Daten bleiben auf dem Gerät.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred ? (
              <Button size="sm" onClick={install}>
                App installieren
              </Button>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">So geht’s</Button>
                </DialogTrigger>
                <DialogContent title="Zum Startbildschirm">
                  <ol className="space-y-3 text-sm leading-relaxed text-muted">
                    <li>
                      <span className="font-medium text-fg">1. Android</span>
                      <br />
                      Chrome/Samsung Internet öffnen → Menü (⋮).
                    </li>
                    <li>
                      <span className="font-medium text-fg">2. Android hinzufügen</span>
                      <br />
                      Tippe auf „App installieren“ oder „Zum Startbildschirm hinzufügen“.
                    </li>
                    <li>
                      <span className="font-medium text-fg">3. iPhone</span>
                      <br />
                      In Safari: Teilen → „Zum Home-Bildschirm“. NOX erscheint als App-Symbol. Alle Daten bleiben auf dem Gerät.
                    </li>
                  </ol>
                </DialogContent>
              </Dialog>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Später
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="relative size-8 shrink-0 rounded-sm text-subtle hover:text-fg after:absolute after:inset-[-8px]"
          aria-label="Hinweis schließen"
        >
          <X className="mx-auto size-4" />
        </button>
      </div>
    </div>
  );
}
