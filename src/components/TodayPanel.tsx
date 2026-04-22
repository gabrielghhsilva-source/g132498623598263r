import { useState, useEffect, useRef, useCallback } from "react";
import { Task } from "@/lib/types";
import { Bell, ChevronRight, ChevronLeft, Check, Clock3, GripVertical } from "lucide-react";

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

interface Props {
  tasks: TodayTask[];
  onMarkDone: (areaId: string, taskId: string) => void;
  onUpdateTime: (areaId: string, taskId: string, dueTime: string | undefined, dueDate?: string) => void;
}

// Timeline configuration: 30-minute slots from 00:00 to 23:30
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 48
const SLOT_HEIGHT = 56; // px per 30-min slot — drives vertical interpolation
const TIMELINE_HEIGHT = SLOTS_PER_DAY * SLOT_HEIGHT;

function minutesToTimeStr(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeStrToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TodayPanel({ tasks, onMarkDone, onUpdateTime }: Props) {
  const [open, setOpen] = useState(false);
  const [notified, setNotified] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Browser notification on mount if there are tasks due today
  useEffect(() => {
    if (tasks.length > 0 && !notified) {
      setNotified(true);
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          sendNotification(tasks.length);
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => {
            if (p === "granted") sendNotification(tasks.length);
          });
        }
      }
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

  // Split tasks: those without dueTime go to "Sem horário", others to timeline
  const untimedTasks = tasks.filter(t => !t.dueTime);
  const timedTasks = tasks
    .filter(t => !!t.dueTime)
    .sort((a, b) => timeStrToMinutes(a.dueTime!) - timeStrToMinutes(b.dueTime!));

  // Convert pointer Y to minutes-of-day based on timeline position
  const yToMinutes = useCallback((clientY: number): number => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const offset = clientY - rect.top + el.scrollTop;
    const ratio = offset / TIMELINE_HEIGHT;
    const mins = Math.round(ratio * 24 * 60);
    return Math.max(0, Math.min(24 * 60 - 1, mins));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    setHoverMinutes(yToMinutes(e.clientY));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    const task = tasks.find(t => t.id === draggingId);
    if (task) {
      const mins = yToMinutes(e.clientY);
      onUpdateTime(task.areaId, task.id, minutesToTimeStr(mins), task.dueDate);
    }
    setDraggingId(null);
    setHoverMinutes(null);
  };

  const handleDropUntimed = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    const task = tasks.find(t => t.id === draggingId);
    if (task) {
      onUpdateTime(task.areaId, task.id, undefined, task.dueDate);
    }
    setDraggingId(null);
    setHoverMinutes(null);
  };

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
        <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-card border-l border-border shadow-2xl z-40 animate-slide-in-right flex flex-col">
          <div className="px-4 py-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Tarefas de Hoje
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.length === 0
                ? "Nenhuma tarefa para hoje 🎉"
                : `${tasks.length} tarefa${tasks.length > 1 ? "s" : ""} pendente${tasks.length > 1 ? "s" : ""} • Arraste para ajustar o horário`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* "Sem horário" section */}
            <div
              className="px-4 py-3 border-b border-border bg-muted/30"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleDropUntimed}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sem horário</span>
              </div>
              {untimedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Arraste tarefas aqui para remover horário</p>
              ) : (
                <div className="space-y-1.5">
                  {untimedTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onMarkDone={() => onMarkDone(t.areaId, t.id)}
                      onDragStart={() => setDraggingId(t.id)}
                      onDragEnd={() => { setDraggingId(null); setHoverMinutes(null); }}
                      isDragging={draggingId === t.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div
              ref={timelineRef}
              className="relative"
              style={{ height: TIMELINE_HEIGHT }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={() => setHoverMinutes(null)}
            >
              {/* Hour/half-hour markers */}
              {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => {
                const mins = i * SLOT_MINUTES;
                const isHour = mins % 60 === 0;
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 flex items-start gap-2 px-4"
                    style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  >
                    <span
                      className={`text-[10px] font-mono w-10 flex-shrink-0 pt-0.5 ${
                        isHour ? "text-foreground/70 font-semibold" : "text-muted-foreground/50"
                      }`}
                    >
                      {minutesToTimeStr(mins)}
                    </span>
                    <div
                      className={`flex-1 border-t ${
                        isHour ? "border-border" : "border-border/40 border-dashed"
                      }`}
                    />
                  </div>
                );
              })}

              {/* Drop indicator */}
              {draggingId && hoverMinutes !== null && (
                <div
                  className="absolute left-14 right-2 h-0.5 bg-primary rounded-full pointer-events-none z-10 transition-all"
                  style={{ top: (hoverMinutes / (24 * 60)) * TIMELINE_HEIGHT }}
                >
                  <span className="absolute -top-3 right-0 text-[10px] font-mono text-primary bg-card px-1 rounded">
                    {minutesToTimeStr(hoverMinutes)}
                  </span>
                </div>
              )}

              {/* Timed tasks positioned by dueTime */}
              {timedTasks.map(t => {
                const mins = timeStrToMinutes(t.dueTime!);
                const top = (mins / (24 * 60)) * TIMELINE_HEIGHT;
                return (
                  <div
                    key={t.id}
                    className="absolute left-14 right-2"
                    style={{ top: top + 4 }}
                  >
                    <TaskCard
                      task={t}
                      onMarkDone={() => onMarkDone(t.areaId, t.id)}
                      onDragStart={() => setDraggingId(t.id)}
                      onDragEnd={() => { setDraggingId(null); setHoverMinutes(null); }}
                      isDragging={draggingId === t.id}
                      showTime
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TaskCardProps {
  task: TodayTask;
  onMarkDone: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  showTime?: boolean;
}

function TaskCard({ task, onMarkDone, onDragStart, onDragEnd, isDragging, showTime }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Some browsers require setData to initiate drag
        try { e.dataTransfer.setData("text/plain", task.id); } catch {}
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`flex items-start gap-2 p-2.5 rounded-lg border bg-background/80 backdrop-blur-sm shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 scale-95" : "hover:border-primary/40"
      } border-border`}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 mt-1 flex-shrink-0" />
      <button
        onClick={onMarkDone}
        className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-success hover:bg-success/10 transition-colors flex-shrink-0 group/check"
        title="Marcar como feita"
      >
        <Check className="w-3 h-3 opacity-0 group-hover/check:opacity-100 text-success" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.text}</p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <span>{task.areaIcon} {task.areaName}</span>
          {showTime && task.dueTime && (
            <span className="font-mono text-primary">• {task.dueTime}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function sendNotification(count: number) {
  new Notification("📋 Tarefas para hoje", {
    body: `Você tem ${count} tarefa${count > 1 ? "s" : ""} para hoje!`,
    icon: "/icon-192.png",
  });
}
