import { useState, useEffect, useRef, useCallback } from "react";
import { Task } from "@/lib/types";
import { Bell, Check, Clock3, GripVertical, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from "lucide-react";

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

// Horizontal timeline configuration: 30-minute slots from 00:00 to 23:30
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 48
const MIN_SLOT_WIDTH = 90;
const MAX_SLOT_WIDTH = 360;
const DEFAULT_SLOT_WIDTH = 180; // px per 30-min slot — drives horizontal interpolation
const SLOT_WIDTH_STEP = 30;
const SLOT_WIDTH_STORAGE_KEY = "today-panel-slot-width";

const MIN_PANEL_HEIGHT = 200;
const DEFAULT_PANEL_HEIGHT = Math.round(typeof window !== "undefined" ? window.innerHeight * 0.5 : 400);

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
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [resizing, setResizing] = useState(false);
  const [slotWidth, setSlotWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_SLOT_WIDTH;
    const saved = Number(localStorage.getItem(SLOT_WIDTH_STORAGE_KEY));
    if (!saved || Number.isNaN(saved)) return DEFAULT_SLOT_WIDTH;
    return Math.max(MIN_SLOT_WIDTH, Math.min(MAX_SLOT_WIDTH, saved));
  });
  const timelineRef = useRef<HTMLDivElement>(null);
  const TIMELINE_WIDTH = SLOTS_PER_DAY * slotWidth;

  useEffect(() => {
    try { localStorage.setItem(SLOT_WIDTH_STORAGE_KEY, String(slotWidth)); } catch {}
  }, [slotWidth]);

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

  // Resize handler
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const max = window.innerHeight - 60;
      setPanelHeight(Math.max(MIN_PANEL_HEIGHT, Math.min(max, newHeight)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [resizing]);

  // Split tasks
  const untimedTasks = tasks.filter(t => !t.dueTime);
  const timedTasks = tasks
    .filter(t => !!t.dueTime)
    .sort((a, b) => timeStrToMinutes(a.dueTime!) - timeStrToMinutes(b.dueTime!));

  // Convert pointer X to minutes-of-day based on timeline position
  const xToMinutes = useCallback((clientX: number): number => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const offset = clientX - rect.left + el.scrollLeft;
    const ratio = offset / TIMELINE_WIDTH;
    const mins = Math.round(ratio * 24 * 60);
    return Math.max(0, Math.min(24 * 60 - 1, mins));
  }, [TIMELINE_WIDTH]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    setHoverMinutes(xToMinutes(e.clientX));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    const task = tasks.find(t => t.id === draggingId);
    if (task) {
      const mins = xToMinutes(e.clientX);
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

  // Bookmark tab button — sits at bottom when closed, on top edge of panel when open
  const TabButton = (
    <button
      onClick={() => setOpen(!open)}
      className={`absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2 rounded-t-2xl border border-b-0 border-border bg-card shadow-lg transition-all hover:bg-accent ${
        tasks.length > 0 && !open ? "animate-pulse" : ""
      }`}
      style={{ bottom: "100%" }}
      title="Tarefas de hoje"
    >
      <Bell className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold">Hoje</span>
      {tasks.length > 0 && (
        <span className="min-w-5 h-5 px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {tasks.length}
        </span>
      )}
      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <>
      {/* Closed state: floating tab button at bottom center — hidden on mobile */}
      {!open && (
        <div className="hidden md:block fixed bottom-0 left-0 right-0 h-0 z-40 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">
            {TabButton}
          </div>
        </div>
      )}

      {/* Open state: bottom panel with resize handle and tab on top — hidden on mobile */}
      {open && (
        <div
          className="hidden md:flex fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-40 flex-col"
          style={{ height: panelHeight }}
        >
          {/* Resize handle on top edge */}
          <div
            onMouseDown={() => setResizing(true)}
            className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/30 transition-colors group"
            title="Arraste para ajustar altura"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 rounded-full bg-border group-hover:bg-primary/60" />
          </div>

          {/* Bookmark tab — relative to panel, positioned above its top edge */}
          <div className="relative">{TabButton}</div>

          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-border flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Tarefas de Hoje
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tasks.length === 0
                  ? "Nenhuma tarefa para hoje 🎉"
                  : `${tasks.length} tarefa${tasks.length > 1 ? "s" : ""} pendente${tasks.length > 1 ? "s" : ""} • Arraste para ajustar o horário`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setSlotWidth(w => Math.max(MIN_SLOT_WIDTH, w - SLOT_WIDTH_STEP))}
                disabled={slotWidth <= MIN_SLOT_WIDTH}
                className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Diminuir espaçamento"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-muted-foreground w-10 text-center tabular-nums">
                {Math.round((slotWidth / DEFAULT_SLOT_WIDTH) * 100)}%
              </span>
              <button
                onClick={() => setSlotWidth(w => Math.min(MAX_SLOT_WIDTH, w + SLOT_WIDTH_STEP))}
                disabled={slotWidth >= MAX_SLOT_WIDTH}
                className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Aumentar espaçamento"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* "Sem horário" section */}
            <div
              className="px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0 max-h-[35%] overflow-y-auto no-scrollbar"
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
                <div className="flex flex-wrap gap-1.5">
                  {untimedTasks.map(t => (
                    <div key={t.id} className="w-64">
                      <TaskCard
                        task={t}
                        onMarkDone={() => onMarkDone(t.areaId, t.id)}
                        onDragStart={() => setDraggingId(t.id)}
                        onDragEnd={() => { setDraggingId(null); setHoverMinutes(null); }}
                        isDragging={draggingId === t.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Horizontal timeline */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar">
              <div
                ref={timelineRef}
                className="relative h-full"
                style={{ width: TIMELINE_WIDTH, minHeight: 180 }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setHoverMinutes(null)}
              >
                {/* Hour/half-hour vertical markers */}
                {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => {
                  const mins = i * SLOT_MINUTES;
                  const isHour = mins % 60 === 0;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex flex-col items-start"
                      style={{ left: i * slotWidth, width: slotWidth }}
                    >
                      <span
                        className={`text-[10px] font-mono px-1 pt-1 ${
                          isHour ? "text-foreground/70 font-semibold" : "text-muted-foreground/50"
                        }`}
                      >
                        {minutesToTimeStr(mins)}
                      </span>
                      <div
                        className={`absolute top-0 bottom-0 left-0 border-l ${
                          isHour ? "border-border" : "border-border/40 border-dashed"
                        }`}
                      />
                    </div>
                  );
                })}

                {/* Drop indicator (vertical line) */}
                {draggingId && hoverMinutes !== null && (
                  <div
                    className="absolute top-6 bottom-2 w-0.5 bg-primary rounded-full pointer-events-none z-10 transition-all"
                    style={{ left: (hoverMinutes / (24 * 60)) * TIMELINE_WIDTH }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary bg-card px-1 rounded whitespace-nowrap">
                      {minutesToTimeStr(hoverMinutes)}
                    </span>
                  </div>
                )}

                {/* Timed tasks positioned by dueTime — stacked vertically when overlapping */}
                {timedTasks.map((t, idx) => {
                  const mins = timeStrToMinutes(t.dueTime!);
                  const left = (mins / (24 * 60)) * TIMELINE_WIDTH;
                  // Simple stacking: count earlier tasks within the same 30-min slot
                  const slotIdx = Math.floor(mins / SLOT_MINUTES);
                  const stackIndex = timedTasks
                    .slice(0, idx)
                    .filter(o => Math.floor(timeStrToMinutes(o.dueTime!) / SLOT_MINUTES) === slotIdx).length;
                  return (
                    <div
                      key={t.id}
                      className="absolute"
                      style={{
                        left: left + 2,
                        top: 24 + stackIndex * 56,
                        width: slotWidth - 6,
                      }}
                    >
                      <TaskCard
                        task={t}
                        onMarkDone={() => onMarkDone(t.areaId, t.id)}
                        onDragStart={() => setDraggingId(t.id)}
                        onDragEnd={() => { setDraggingId(null); setHoverMinutes(null); }}
                        isDragging={draggingId === t.id}
                        showTime
                        compact
                      />
                    </div>
                  );
                })}
              </div>
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
  compact?: boolean;
}

function TaskCard({ task, onMarkDone, onDragStart, onDragEnd, isDragging, showTime, compact }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", task.id); } catch {}
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`flex items-start gap-1.5 ${compact ? "p-1.5" : "p-2.5"} rounded-lg border bg-background/90 backdrop-blur-sm shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 scale-95" : "hover:border-primary/40"
      } border-border`}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
      <button
        onClick={onMarkDone}
        className="mt-0.5 w-4 h-4 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-success hover:bg-success/10 transition-colors flex-shrink-0 group/check"
        title="Marcar como feita"
      >
        <Check className="w-2.5 h-2.5 opacity-0 group-hover/check:opacity-100 text-success" />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`${compact ? "text-xs" : "text-sm"} font-medium truncate`}>{task.text}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
          <span className="truncate">{task.areaIcon} {task.areaName}</span>
          {showTime && task.dueTime && (
            <span className="font-mono text-primary flex-shrink-0">• {task.dueTime}</span>
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
