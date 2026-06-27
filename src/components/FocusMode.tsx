import { useEffect, useMemo, useState } from "react";
import { Task } from "@/lib/types";
import { Play, Pause, RotateCcw, X, Check, SkipForward, Maximize2 } from "lucide-react";

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: TodayTask[];
  onMarkDone: (areaId: string, taskId: string) => void;
}

/**
 * Modo Foco em tela cheia: mostra uma tarefa de cada vez com um Pomodoro grande.
 * Pula automaticamente para a próxima ao concluir.
 */
export function FocusMode({ open, onClose, tasks, onMarkDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [completedCount, setCompletedCount] = useState(0);

  const pending = useMemo(() => tasks.filter(t => t.status !== "done"), [tasks]);
  const current = pending[Math.min(idx, Math.max(0, pending.length - 1))];

  useEffect(() => { if (open) { setIdx(0); setCompletedCount(0); } }, [open]);

  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [open, running]);

  useEffect(() => {
    if (seconds !== 0 || !open) return;
    setRunning(false);
    const next = phase === "work" ? "break" : "work";
    setPhase(next);
    setSeconds(next === "work" ? 25 * 60 : 5 * 60);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = next === "break" ? 880 : 523;
      gain.gain.value = 0.3; osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* sem áudio */ }
  }, [seconds, phase, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); setRunning(r => !r); }
      else if (e.key.toLowerCase() === "d" && current) handleDone();
      else if (e.key.toLowerCase() === "s") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current]);

  if (!open) return null;

  const handleDone = () => {
    if (!current) return;
    onMarkDone(current.areaId, current.id);
    setCompletedCount(c => c + 1);
  };
  const handleSkip = () => setIdx(i => (pending.length ? (i + 1) % pending.length : 0));
  const resetTimer = () => { setRunning(false); setSeconds(phase === "work" ? 25 * 60 : 5 * 60); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const totalSecs = phase === "work" ? 25 * 60 : 5 * 60;
  const progress = ((totalSecs - seconds) / totalSecs) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-6 py-10 animate-in fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent text-muted-foreground"
        title="Sair do Foco (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Maximize2 className="w-3.5 h-3.5" /> Modo Foco
      </div>

      <div className="text-center mb-8 max-w-2xl">
        <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-3">
          {phase === "work" ? "Foco" : "Pausa"} · {pending.length} pendente{pending.length === 1 ? "" : "s"} · {completedCount} feita{completedCount === 1 ? "" : "s"} agora
        </p>
        {current ? (
          <>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight">{current.text}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {current.areaIcon} {current.areaName}
              {current.dueTime && ` · ${current.dueTime}`}
            </p>
          </>
        ) : (
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-success">Tudo limpo 🎉</h1>
        )}
      </div>

      {/* Pomodoro grande circular */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke={phase === "work" ? "hsl(var(--primary))" : "hsl(var(--success))"}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 289.027} 289.027`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono tabular-nums text-6xl sm:text-7xl font-bold tracking-tight">{mm}:{ss}</span>
          <span className="text-xs text-muted-foreground mt-2">{phase === "work" ? "25 min" : "5 min"} · espaço pra {running ? "pausar" : "começar"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setRunning(r => !r)}
          className="px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:opacity-90"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? "Pausar" : "Iniciar"}
        </button>
        <button onClick={resetTimer} className="p-3 rounded-full border border-border hover:bg-accent" title="Reiniciar timer">
          <RotateCcw className="w-4 h-4" />
        </button>
        {current && (
          <button onClick={handleDone} className="px-4 py-3 rounded-full bg-success text-success-foreground font-medium flex items-center gap-2 hover:opacity-90" title="Concluir (D)">
            <Check className="w-4 h-4" /> Feito
          </button>
        )}
        {pending.length > 1 && (
          <button onClick={handleSkip} className="p-3 rounded-full border border-border hover:bg-accent" title="Próxima (S)">
            <SkipForward className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        Atalhos: <kbd className="px-1 rounded bg-muted">Espaço</kbd> play/pause · <kbd className="px-1 rounded bg-muted">D</kbd> feito · <kbd className="px-1 rounded bg-muted">S</kbd> pular · <kbd className="px-1 rounded bg-muted">Esc</kbd> sair
      </p>
    </div>
  );
}
