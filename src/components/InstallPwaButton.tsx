import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check, Share } from "lucide-react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("RuJe IA instalada no seu dispositivo!");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIOS) {
      toast.info("No iPhone: toque em Partilhar e depois em “Adicionar ao ecrã principal”.", {
        duration: 8000,
      });
      return;
    }
    toast.info(
      "Abra o menu do navegador e escolha “Instalar aplicação”. Se já estiver instalada, procure o ícone RuJe IA no seu ecrã.",
      { duration: 8000 },
    );
  }

  if (installed) {
    return (
      <Button variant="outline" className={className} disabled>
        <Check className="h-4 w-4" /> Aplicação instalada
      </Button>
    );
  }

  return (
    <Button onClick={install} className={className}>
      {isIOS && !deferred ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      Instalar aplicação
    </Button>
  );
}
