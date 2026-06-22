import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Task } from "@/lib/types";
import {
  Bell, Check, Clock3, ListChecks, CalendarClock, CalendarDays,
  ChevronLeft, Play, Pause, RotateCcw, Timer, Plus, Minus, X, GripVertical,
} from "lucide-react";

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

interface Props {
  tasks: TodayTask[];
  onMarkDone: (areaId: string, taskId: string) => void;
  onUpdateTime: (areaId: string, taskId: string, dueTime: string | undefined, dueDate?: string) => void;
  onUpdateEnd: (areaId: string, taskId: string, endDate: string | undefined, endTime: string | undefined) => void;
  /** Called when a task is dropped on the FAB or panel to assign today as dueDate. */
  onAssignToday?: (taskId: string) => void;
  /** Called when a task is dragged out of the panel to clear its dueDate. */
  onClearDueDate?: (areaId: string, taskId: string) => void;
}

type ViewMode = "list" | "timeline" | "agenda";

const VIEW_STORAGE_KEY = "today-panel-view-mode";
const OPEN_STORAGE_KEY = "today-panel-open";
const WIDTH_STORAGE_KEY = "today-panel-width";
const MIN_WIDTH = 360;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 460;

const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = 48;
const DEFAULT_SLOT_WIDTH = 120;

function minutesToTimeStr(mins: number): string {
  const c = Math.max(0, Math.min(24 * 60 - 1, mins));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}
function timeStrToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TodayPanel({
  tasks, onMarkDone, onUpdateTime, onUpdateEnd, onAssignToday, onClearDueDate,
}: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(OPEN_STORAGE_KEY) === "1";
  });
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "list";
  });
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const v = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return v && !Number.isNaN(v) ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, v)) : DEFAULT_WIDTH;
  });
  const [resizing, setResizing] = useState(false);
  const [fabHover, setFabHover] = useState(false);

  useEffect(() => { try { localStorage.setItem(OPEN_STORAGE_KEY, open ? "1" : "0"); } catch {} }, [open]);
  useEffect(() => { try { localStorage.setItem(VIEW_STORAGE_KEY, view); } catch {} }, [view]);
  useEffect(() => { try { localStorage.setItem(WIDTH_STORAGE_KEY, String(width)); } catch {} }, [width]);

  // Atalho T → abre/fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "SELECT")) return;
      if (e.key === "t" || e.key === "T") { e.preventDefault(); setOpen(v => !v); }
      else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Resize handler (left edge)
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing]);

  // tick para "Foco agora"
  const [nowMins, setNowMins] = useState(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date(); setNowMins(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Drop handlers (FAB e painel)
  const handleDropAssign = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && onAssignToday) onAssignToday(taskId);
  };
  const allowDrop = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("text/plain")) e.preventDefault();
  };

  const focusTask = useMemo(() => {
    const timed = tasks
      .filter(t => t.dueTime && t.status !== "done")
      .map(t => ({ t, mins: timeStrToMinutes(t.dueTime!) }))
      .sort((a, b) => a.mins - b.mins);
    const upcoming = timed.find(x => x.mins >= nowMins) || timed[0];
    return upcoming;
  }, [tasks, nowMins]);

  // FAB
  const FAB = (
    <button
      onClick={() => setOpen(true)}
      onDragOver={allowDrop}
      onDragEnter={() => setFabHover(true)}
      onDragLeave={() => setFabHover(false)}
      onDrop={(e) => { setFabHover(false); handleDropAssign(e); }}
      title="Tarefas de hoje (T)"
      className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-primary/30 ${
        fabHover ? "ring-4 ring-primary/40 scale-110" : ""
      } ${tasks.length > 0 ? "animate-in" : ""}`}
    >
      <Bell className="w-6 h-6" />
      {tasks.length > 0 && (
        <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center border-2 border-background">
          {tasks.length}
        </span>
      )}
    </button>
  );

  return (
    <>
      {!open && (
        <div className="hidden md:block">{FAB}</div>
      )}

      {open && (
        <>
          {/* overlay leve só pra fechar clicando fora */}
          <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setOpen(false)} />

          <aside
            onDragOver={allowDrop}
            onDrop={handleDropAssign}
            className="hidden md:flex fixed top-0 right-0 bottom-0 z-40 bg-card border-l border-border shadow-2xl flex-col glass-card"
            style={{ width }}
          >
            {/* Resize edge */}
            <div
              onMouseDown={() => setResizing(true)}
              className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 transition-colors group z-10"
              title="Arraste para redimensionar"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-border group-hover:bg-primary/60" />
            </div>

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight truncate">Hoje</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {tasks.length === 0 ? "Sem tarefas 🎉" : `${tasks.length} pendente${tasks.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ViewToggle current={view} onChange={setView} />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors ml-1"
                  title="Fechar (T ou Esc)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Foco agora */}
            {focusTask && (
              <FocusNow
                task={focusTask.t}
                minsUntil={focusTask.mins - nowMins}
                onDone={() => onMarkDone(focusTask.t.areaId, focusTask.t.id)}
              />
            )}

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden min-h-0">
              {view === "list" && (
                <ListView
                  tasks={tasks}
                  onMarkDone={onMarkDone}
                  onUpdateTime={onUpdateTime}
                  onClearDueDate={onClearDueDate}
                />
              )}
              {view === "timeline" && (
                <TimelineView
                  tasks={tasks}
                  onMarkDone={onMarkDone}
                  onUpdateTime={onUpdateTime}
                  onUpdateEnd={onUpdateEnd}
                />
              )}
              {view === "agenda" && (
                <AgendaView
                  tasks={tasks}
                  onMarkDone={onMarkDone}
                  nowMins={nowMins}
                />
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ============================ View toggle ============================ */
function ViewToggle({ current, onChange }: { current: ViewMode; onChange: (v: ViewMode) => void }) {
  const items: { id: ViewMode; icon: typeof ListChecks; label: string }[] = [
    { id: "list", icon: ListChecks, label: "Lista" },
    { id: "timeline", icon: CalendarClock, label: "Timeline" },
    { id: "agenda", icon: CalendarDays, label: "Agenda" },
  ];
  return (
    <div className="flex items-center bg-muted/60 rounded-md p-0.5">
      {items.map(it => {
        const Icon = it.icon;
        const active = current === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            title={it.label}
            className={`p-1.5 rounded transition-all ${
              active ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/* ============================ Foco agora ============================ */
function FocusNow({ task, minsUntil, onDone }: { task: TodayTask; minsUntil: number; onDone: () => void }) {
  const label =
    minsUntil <= 0 && minsUntil > -60 ? "agora"
    : minsUntil > 0 ? `em ${minsUntil < 60 ? `${minsUntil} min` : `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`}`
    : `há ${Math.abs(minsUntil) < 60 ? `${Math.abs(minsUntil)} min` : `${Math.floor(Math.abs(minsUntil) / 60)}h`}`;

  const [pomoOpen, setPomoOpen] = useState(false);

  return (
    <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
      <div className="flex items-center gap-2 mb-1">
        <Timer className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Foco agora</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDone}
          className="w-6 h-6 rounded-full border-2 border-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center flex-shrink-0 transition-all"
          title="Concluir"
        >
          <Check className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.text}</p>
          <p className="text-[11px] text-muted-foreground">
            {task.areaIcon} {task.areaName} · {task.dueTime} · {label}
          </p>
        </div>
        <button
          onClick={() => setPomoOpen(v => !v)}
          className={`p-1.5 rounded-md border transition-all ${
            pomoOpen ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
          }`}
          title="Pomodoro 25/5"
        >
          <Timer className="w-3.5 h-3.5" />
        </button>
      </div>
      {pomoOpen && <Pomodoro onClose={() => setPomoOpen(false)} />}
    </div>
  );
}

function Pomodoro({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds === 0) {
      setRunning(false);
      const next = phase === "work" ? "break" : "work";
      setPhase(next);
      setSeconds(next === "work" ? 25 * 60 : 5 * 60);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 660; gain.gain.value = 0.25; osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }
  }, [seconds, phase]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className={`px-2 py-0.5 rounded font-medium ${phase === "work" ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-600"}`}>
        {phase === "work" ? "Foco" : "Pausa"}
      </span>
      <span className="font-mono tabular-nums text-base font-bold">{mm}:{ss}</span>
      <button onClick={() => setRunning(v => !v)} className="p-1 rounded hover:bg-accent" title={running ? "Pausar" : "Iniciar"}>
        {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setRunning(false); setSeconds(phase === "work" ? 25 * 60 : 5 * 60); }} className="p-1 rounded hover:bg-accent" title="Reset">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button onClick={onClose} className="p-1 rounded hover:bg-accent ml-auto" title="Fechar"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/* ============================ Lista (default) ============================ */
function ListView({
  tasks, onMarkDone, onUpdateTime, onClearDueDate,
}: {
  tasks: TodayTask[];
  onMarkDone: (areaId: string, taskId: string) => void;
  onUpdateTime: (areaId: string, taskId: string, dueTime: string | undefined, dueDate?: string) => void;
  onClearDueDate?: (areaId: string, taskId: string) => void;
}) {
  const timed = tasks.filter(t => t.dueTime).sort((a, b) =>
    timeStrToMinutes(a.dueTime!) - timeStrToMinutes(b.dueTime!));
  const untimed = tasks.filter(t => !t.dueTime);

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-sm">Nada para hoje.</p>
        <p className="text-[11px] mt-1 opacity-70">Arraste tarefas do Kanban pra cá pra marcar como hoje.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3 py-2 space-y-3">
      {timed.length > 0 && (
        <Section title="Com horário" icon={<Clock3 className="w-3.5 h-3.5" />}>
          {timed.map(t => (
            <ListRow key={t.id} task={t} onMarkDone={() => onMarkDone(t.areaId, t.id)}
              onUpdateTime={(time) => onUpdateTime(t.areaId, t.id, time, t.dueDate)}
              onSnooze={(min) => onUpdateTime(t.areaId, t.id, shiftTime(t.dueTime!, min), t.dueDate)}
              onPostpone={() => onUpdateTime(t.areaId, t.id, t.dueTime, tomorrowStr())}
              onClearDue={() => onClearDueDate?.(t.areaId, t.id)}
            />
          ))}
        </Section>
      )}
      {untimed.length > 0 && (
        <Section title="Sem horário" icon={<Clock3 className="w-3.5 h-3.5" />}>
          {untimed.map(t => (
            <ListRow key={t.id} task={t} onMarkDone={() => onMarkDone(t.areaId, t.id)}
              onUpdateTime={(time) => onUpdateTime(t.areaId, t.id, time, t.dueDate)}
              onPostpone={() => onUpdateTime(t.areaId, t.id, t.dueTime, tomorrowStr())}
              onClearDue={() => onClearDueDate?.(t.areaId, t.id)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}{title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ListRow({
  task, onMarkDone, onUpdateTime, onSnooze, onPostpone, onClearDue,
}: {
  task: TodayTask;
  onMarkDone: () => void;
  onUpdateTime: (time: string | undefined) => void;
  onSnooze?: (minutes: number) => void;
  onPostpone: () => void;
  onClearDue?: () => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  const [timeVal, setTimeVal] = useState(task.dueTime || "");

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); }}
      className="group flex items-center gap-2 px-2 py-2 rounded-lg border border-border/60 hover:border-border bg-card/60 hover:bg-card transition-all"
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab flex-shrink-0" />
      <button
        onClick={onMarkDone}
        className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-all"
        title="Concluir"
      >
        <Check className="w-3 h-3 opacity-0 group-hover:opacity-60" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{task.text}</p>
        <p className="text-[10px] text-muted-foreground truncate">{task.areaIcon} {task.areaName}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.dueTime && onSnooze && (
          <>
            <button onClick={() => onSnooze(15)} className="px-1.5 py-0.5 text-[10px] rounded hover:bg-accent" title="+15 min">+15</button>
            <button onClick={() => onSnooze(60)} className="px-1.5 py-0.5 text-[10px] rounded hover:bg-accent" title="+1 hora">+1h</button>
          </>
        )}
        <button onClick={onPostpone} className="px-1.5 py-0.5 text-[10px] rounded hover:bg-accent" title="Adiar pra amanhã">→</button>
        {onClearDue && (
          <button onClick={onClearDue} className="p-1 rounded hover:bg-destructive/20 hover:text-destructive" title="Tirar de hoje">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {editingTime ? (
        <input
          type="time"
          value={timeVal}
          autoFocus
          onChange={(e) => setTimeVal(e.target.value)}
          onBlur={() => { setEditingTime(false); onUpdateTime(timeVal || undefined); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") setEditingTime(false); }}
          className="text-xs font-mono bg-background border border-border rounded px-1 py-0.5 w-20"
        />
      ) : (
        <button
          onClick={() => { setTimeVal(task.dueTime || ""); setEditingTime(true); }}
          className="text-xs font-mono tabular-nums text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent flex-shrink-0"
          title="Editar horário"
        >
          {task.dueTime || "--:--"}
        </button>
      )}
    </div>
  );
}

function shiftTime(time: string, minutes: number): string {
  return minutesToTimeStr(timeStrToMinutes(time) + minutes);
}
function tomorrowStr(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ============================ Agenda ============================ */
function AgendaView({ tasks, onMarkDone, nowMins }: { tasks: TodayTask[]; onMarkDone: (a: string, t: string) => void; nowMins: number }) {
  const groups = useMemo(() => {
    const buckets: Record<string, TodayTask[]> = { manha: [], tarde: [], noite: [], sem: [] };
    for (const t of tasks) {
      if (!t.dueTime) { buckets.sem.push(t); continue; }
      const m = timeStrToMinutes(t.dueTime);
      if (m < 12 * 60) buckets.manha.push(t);
      else if (m < 18 * 60) buckets.tarde.push(t);
      else buckets.noite.push(t);
    }
    const sortFn = (a: TodayTask, b: TodayTask) => timeStrToMinutes(a.dueTime || "00:00") - timeStrToMinutes(b.dueTime || "00:00");
    Object.values(buckets).forEach(b => b.sort(sortFn));
    return buckets;
  }, [tasks]);

  const labels: { key: keyof typeof groups; title: string; range: string; emoji: string }[] = [
    { key: "manha", title: "Manhã", range: "00:00 – 12:00", emoji: "🌅" },
    { key: "tarde", title: "Tarde", range: "12:00 – 18:00", emoji: "☀️" },
    { key: "noite", title: "Noite", range: "18:00 – 24:00", emoji: "🌙" },
    { key: "sem", title: "Sem horário", range: "", emoji: "⏱️" },
  ];

  return (
    <div className="h-full overflow-y-auto px-3 py-2 space-y-3">
      {labels.map(l => (
        <div key={l.key}>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {l.emoji} {l.title}
            </span>
            <span className="text-[10px] text-muted-foreground/70">{l.range}</span>
          </div>
          {groups[l.key].length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic px-2 py-1">—</p>
          ) : (
            <div className="space-y-1">
              {groups[l.key].map(t => {
                const m = t.dueTime ? timeStrToMinutes(t.dueTime) : null;
                const past = m !== null && m < nowMins;
                return (
                  <div key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/60 bg-card/60 ${past ? "opacity-60" : ""}`}>
                    <button onClick={() => onMarkDone(t.areaId, t.id)} className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 opacity-0 hover:opacity-60" />
                    </button>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground w-12 flex-shrink-0">{t.dueTime || "--:--"}</span>
                    <span className="text-sm truncate flex-1">{t.text}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{t.areaIcon}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================ Timeline (compacta) ============================ */
function TimelineView({
  tasks, onMarkDone, onUpdateTime,
}: {
  tasks: TodayTask[];
  onMarkDone: (a: string, t: string) => void;
  onUpdateTime: (a: string, t: string, time: string | undefined, dueDate?: string) => void;
  onUpdateEnd: (a: string, t: string, endDate: string | undefined, endTime: string | undefined) => void;
}) {
  const [slotWidth, setSlotWidth] = useState(DEFAULT_SLOT_WIDTH);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverMin, setHoverMin] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalW = SLOTS_PER_DAY * slotWidth;

  const xToMin = useCallback((cx: number) => {
    const el = ref.current; if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(24 * 60 - 1, Math.round(((cx - r.left + el.scrollLeft) / totalW) * 24 * 60)));
  }, [totalW]);

  const timed = tasks.filter(t => t.dueTime);
  const untimed = tasks.filter(t => !t.dueTime);

  // pan drag
  const onPanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"],button,input')) return;
    const el = scrollRef.current; if (!el) return;
    const startX = e.clientX; const startScroll = el.scrollLeft;
    const pid = e.pointerId;
    try { el.setPointerCapture(pid); } catch {}
    const move = (ev: PointerEvent) => { el.scrollLeft = startScroll - (ev.clientX - startX); };
    const up = () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up);
      try { el.releasePointerCapture(pid); } catch {}
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Arraste pra ajustar o horário</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setSlotWidth(w => Math.max(60, w - 20))} className="p-1 rounded hover:bg-accent"><Minus className="w-3 h-3" /></button>
          <span className="font-mono w-8 text-center">{Math.round(slotWidth / DEFAULT_SLOT_WIDTH * 100)}%</span>
          <button onClick={() => setSlotWidth(w => Math.min(240, w + 20))} className="p-1 rounded hover:bg-accent"><Plus className="w-3 h-3" /></button>
        </div>
      </div>

      {untimed.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 max-h-32 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Sem horário</div>
          <div className="flex flex-wrap gap-1">
            {untimed.map(t => (
              <div key={t.id}
                draggable
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => { setDraggingId(null); setHoverMin(null); }}
                className="px-2 py-1 text-xs bg-card border border-border rounded cursor-grab truncate max-w-[200px]"
                title={t.text}
              >
                {t.areaIcon} {t.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        onPointerDown={onPanStart}
        style={{ touchAction: "pan-y" }}
        className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab"
      >
        <div
          ref={ref}
          className="relative h-full min-h-[160px]"
          style={{ width: totalW }}
          onDragOver={(e) => { e.preventDefault(); if (draggingId) setHoverMin(xToMin(e.clientX)); }}
          onDrop={(e) => {
            e.preventDefault();
            if (!draggingId) return;
            const t = tasks.find(x => x.id === draggingId);
            if (t) onUpdateTime(t.areaId, t.id, minutesToTimeStr(xToMin(e.clientX)), t.dueDate);
            setDraggingId(null); setHoverMin(null);
          }}
          onDragLeave={() => setHoverMin(null)}
        >
          {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => {
            const isHour = (i * SLOT_MINUTES) % 60 === 0;
            return (
              <div key={i} className="absolute top-0 bottom-0" style={{ left: i * slotWidth, width: slotWidth }}>
                <span className={`text-[9px] font-mono px-1 pt-1 absolute ${isHour ? "text-foreground/70 font-semibold" : "text-muted-foreground/40"}`}>
                  {minutesToTimeStr(i * SLOT_MINUTES)}
                </span>
                <div className={`absolute top-0 bottom-0 left-0 border-l ${isHour ? "border-border" : "border-border/30 border-dashed"}`} />
              </div>
            );
          })}

          {hoverMin !== null && (
            <div className="absolute top-5 bottom-2 w-0.5 bg-primary rounded pointer-events-none z-10"
              style={{ left: (hoverMin / (24 * 60)) * totalW }}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary bg-card px-1 rounded">
                {minutesToTimeStr(hoverMin)}
              </span>
            </div>
          )}

          {timed.map((t, idx) => {
            const m = timeStrToMinutes(t.dueTime!);
            const left = (m / (24 * 60)) * totalW;
            return (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => { setDraggingId(null); setHoverMin(null); }}
                className="absolute bg-primary/15 border border-primary/40 hover:bg-primary/25 rounded px-2 py-1 cursor-grab transition-colors"
                style={{ left, top: 28 + (idx % 4) * 40, minWidth: 120, maxWidth: 240 }}
                title={t.text}
              >
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onMarkDone(t.areaId, t.id)} className="w-3.5 h-3.5 rounded-full border border-primary/60 hover:bg-primary/30 flex-shrink-0" />
                  <span className="text-[10px] font-mono">{t.dueTime}</span>
                </div>
                <p className="text-xs truncate mt-0.5">{t.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
