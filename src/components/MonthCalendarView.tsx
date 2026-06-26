import { useMemo, useState } from "react";
import { Task, TaskArea, TaskTag, PRIORITY_META } from "@/lib/types";
import { CalendarDays, ChevronLeft, ChevronRight, Check, Clock, Repeat } from "lucide-react";
import { TagBadges } from "./TagPicker";

interface CalendarTask extends Task {
  areaId: string;
  areaName: string;
  areaIcon: string;
}

interface Props {
  areas: TaskArea[];
  tags: TaskTag[];
  onTaskClick: (areaId: string, task: Task) => void;
  onMarkDone: (areaId: string, taskId: string) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function MonthCalendarView({ areas, tags, onTaskClick, onMarkDone }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = toDateKey(new Date());
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const area of areas) {
      for (const task of area.tasks) {
        if (!task.dueDate) continue;
        // Cópias concluídas de recorrência já aparecem em Prontas; no calendário
        // mensal mantemos apenas a próxima ocorrência rolante.
        if (task.status === "done" && task.recurrenceSourceId) continue;
        const item: CalendarTask = { ...task, areaId: area.id, areaName: area.name, areaIcon: area.icon };
        map.set(task.dueDate, [...(map.get(task.dueDate) || []), item]);
      }
    }
    for (const [date, list] of map.entries()) {
      map.set(date, list.sort((a, b) => (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99")));
    }
    return map;
  }, [areas]);

  const days = useMemo(() => buildCalendarDays(cursor), [cursor]);

  const goMonth = (delta: number) => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="rounded-xl glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm sm:text-base capitalize truncate">{monthLabel}</h2>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Visão mensal das tarefas com data</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-lg hover:bg-accent" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-2.5 py-1.5 rounded-lg border border-border text-xs hover:bg-accent">
            Hoje
          </button>
          <button onClick={() => goMonth(1)} className="p-2 rounded-lg hover:bg-accent" title="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[760px] sm:min-w-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEKDAYS.map(day => (
              <div key={day} className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[minmax(108px,1fr)] sm:auto-rows-[minmax(140px,1fr)]">
            {days.map(day => {
              const dateKey = toDateKey(day.date);
              const items = tasksByDate.get(dateKey) || [];
              const isCurrentMonth = day.date.getMonth() === cursor.getMonth();
              const isToday = dateKey === today;
              return (
                <div
                  key={dateKey}
                  className={`min-w-0 border-r border-b border-border p-1.5 sm:p-2 ${isCurrentMonth ? "bg-card/40" : "bg-muted/20 text-muted-foreground"}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`h-6 min-w-6 px-1 rounded-full flex items-center justify-center text-[11px] font-semibold ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                      {day.date.getDate()}
                    </span>
                    {items.length > 0 && <span className="text-[10px] text-muted-foreground">{items.length}</span>}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {items.slice(0, 4).map(task => (
                      <CalendarTaskPill
                        key={task.id}
                        task={task}
                        tags={tags}
                        onOpen={() => onTaskClick(task.areaId, task)}
                        onDone={() => onMarkDone(task.areaId, task.id)}
                      />
                    ))}
                    {items.length > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{items.length - 4} tarefas</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarTaskPill({ task, tags, onOpen, onDone }: { task: CalendarTask; tags: TaskTag[]; onOpen: () => void; onDone: () => void }) {
  const priority = task.priority || "none";
  const color = PRIORITY_META[priority].color;
  const taskTags = tags.filter(t => task.tagIds?.includes(t.id));
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full text-left rounded-md border bg-background/70 px-1.5 py-1 hover:border-primary/40 hover:bg-background transition-colors ${task.status === "done" ? "opacity-60" : ""}`}
      style={{ borderLeftColor: priority === "none" ? undefined : color, borderLeftWidth: priority === "none" ? undefined : 3 }}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[10px] flex-shrink-0">{task.areaIcon}</span>
        <span className={`truncate text-[11px] font-medium ${task.status === "done" ? "line-through" : ""}`}>{task.text || "Sem título"}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDone(); }}
          className="ml-auto opacity-0 group-hover:opacity-100 sm:opacity-60 hover:text-success"
          title="Concluir"
        >
          <Check className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
        {task.dueTime && <><Clock className="w-2.5 h-2.5" /> {task.dueTime}</>}
        {task.recurrence && <Repeat className="w-2.5 h-2.5 text-info" />}
        {taskTags.length > 0 && <TagBadges tags={taskTags} max={1} />}
      </div>
    </button>
  );
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: { date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({ date });
  }
  return days;
}

function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}