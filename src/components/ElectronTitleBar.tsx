import { useEffect, useState } from "react";
import { Minus, X } from "lucide-react";

// API exposta pelo preload do Electron (electron/preload.cjs)
type ElectronApi = {
  isElectron?: boolean;
  hide?: () => Promise<void>;
  quit?: () => Promise<void>;
};

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}

/**
 * Barra superior fininha visível apenas quando rodando dentro do Electron.
 * - Área central arrastável (move a janela frameless).
 * - Botão "—" esconde a janela (mantém o app na bandeja).
 * - Botão "X" também esconde (mais visível). Para sair de vez, use o menu
 *   do ícone da bandeja → "Sair".
 */
export function ElectronTitleBar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const on = !!window.electronAPI?.isElectron;
    setIsElectron(on);
    if (on) {
      // Reserva espaço no topo pra barra não cobrir o header do app
      document.body.style.paddingTop = "28px";
      return () => { document.body.style.paddingTop = ""; };
    }
  }, []);

  if (!isElectron) return null;

  const hide = () => window.electronAPI?.hide?.();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-7 flex items-center justify-end bg-card/80 backdrop-blur-md border-b border-border"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <button
        onClick={hide}
        title="Esconder (Esc)"
        aria-label="Esconder assistente"
        className="h-full w-9 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={hide}
        title="Fechar (Esc)"
        aria-label="Fechar assistente"
        className="h-full w-9 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
