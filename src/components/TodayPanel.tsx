import { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { Bell, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

interface Props {
  tasks: TodayTask[];
  onMarkDone: (areaId: string, taskId: string) => void;
}

export function TodayPanel({ tasks, onMarkDone }: Props) {
  const [open, setOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  // Notification on mount if there are tasks due today
  useEffect(() => {
    if (tasks.length > 0 && !notified) {
      setNotified(true);
      // Try browser notification
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          sendNotification(tasks.length);
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => {
            if (p === "granted") sendNotification(tasks.length);
          });
        }
      }
      // Play bell sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 830;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    }
  }, [tasks.length, notified]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 px-2 py-3 rounded-l-xl border border-r-0 border-border bg-card shadow-lg transition-all hover:bg-accent ${
          tasks.length > 0 ? "animate-pulse" : ""
        }`}
        title="Tarefas de hoje"
      >
        <Bell className="w-4 h-4" />
        {tasks.length > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {tasks.length}
          </span>
        )}
        {open ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-card border-l border-border shadow-2xl z-40 animate-slide-in-right flex flex-col">
          <div className="px-4 py-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Tarefas de Hoje
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.length === 0 ? "Nenhuma tarefa para hoje 🎉" : `${tasks.length} tarefa${tasks.length > 1 ? "s" : ""} pendente${tasks.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/50">
                <button
                  onClick={() => onMarkDone(t.areaId, t.id)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-success hover:bg-success/10 transition-colors flex-shrink-0"
                  title="Marcar como feita"
                >
                  <Check className="w-3 h-3 opacity-0 hover:opacity-100 text-success" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.areaIcon} {t.areaName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function sendNotification(count: number) {
  new Notification("📋 Tarefas para hoje", {
    body: `Você tem ${count} tarefa${count > 1 ? "s" : ""} para hoje!`,
    icon: "/placeholder.svg",
  });
}
