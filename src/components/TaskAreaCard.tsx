import { TaskArea, RecurrenceRule } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TaskStatus, TaskTextStyle } from "@/lib/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface Props {
  area: TaskArea;
  timezone: string;
  isCustom?: boolean;
  onToggleCollapse: () => void;
  onAddTask: (text: string, dueDate?: string, recurrence?: RecurrenceRule, dueTime?: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateStyle: (taskId: string, style: Partial<TaskTextStyle>) => void;
  onUpdateText: (taskId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteArea?: () => void;
  onAddComment: (taskId: string, text: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
  onUpdateTime?: (taskId: string, dueTime: string | undefined, dueDate?: string) => void;
}

export function TaskAreaCard({ area, timezone, isCustom, onToggleCollapse, onAddTask, onUpdateStatus, onUpdateStyle, onUpdateText, onDeleteTask, onDeleteArea, onAddComment, onDeleteComment, onUpdateTime }: Props) {
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recType, setRecType] = useState<"weekly" | "monthly">("weekly");
  const [recDays, setRecDays] = useState<number[]>([]);
  const [recDayOfMonth, setRecDayOfMonth] = useState(1);
  const [recAdvance, setRecAdvance] = useState(1);

  const doneCount = area.tasks.filter(t => t.status === "done").length;
  const totalCount = area.tasks.length;

  const handleAdd = () => {
    if (!newTask.trim()) return;
    let recurrence: RecurrenceRule | undefined;
    if (showRecurrence) {
      recurrence = {
        type: recType,
        advanceDays: recAdvance,
        ...(recType === "weekly" ? { daysOfWeek: recDays } : { dayOfMonth: recDayOfMonth }),
      };
    }
    onAddTask(newTask.trim(), newDate || undefined, recurrence, newTime || undefined);
    setNewTask("");
    setNewDate("");
    setNewTime("");
    setShowAdd(false);
    setShowRecurrence(false);
    setRecDays([]);
  };

  const toggleDay = (day: number) => {
    setRecDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in transition-all duration-300">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={onToggleCollapse}
          className="flex-1 flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 hover:bg-accent/30 transition-colors min-w-0"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{area.icon}</span>
            <h2 className="text-base sm:text-lg font-semibold truncate">{area.name}</h2>
            {totalCount > 0 && (
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-medium flex-shrink-0">
                {doneCount}/{totalCount}
              </span>
            )}
          </div>
          {area.collapsed ? (
            <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform flex-shrink-0" />
          )}
        </button>
        {isCustom && onDeleteArea && (
          <button onClick={onDeleteArea} className="px-3 py-2 mr-1 sm:mr-2 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0" title="Excluir área" aria-label="Excluir área">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        )}
      </div>

      {/* Content */}
      {!area.collapsed && (
        <div className="px-3 sm:px-5 pb-4 space-y-2 animate-fade-in">
          {area.tasks.length === 0 && !showAdd && (
            <p className="text-sm text-muted-foreground py-3 text-center">
              Nenhuma tarefa ainda
            </p>
          )}

          {area.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              timezone={timezone}
              onStatusChange={s => onUpdateStatus(task.id, s)}
              onStyleChange={s => onUpdateStyle(task.id, s)}
              onTextChange={t => onUpdateText(task.id, t)}
              onDelete={() => onDeleteTask(task.id)}
              onAddComment={text => onAddComment(task.id, text)}
              onDeleteComment={commentId => onDeleteComment(task.id, commentId)}
              onTimeChange={onUpdateTime ? (time, date) => onUpdateTime(task.id, time, date) : undefined}
            />
          ))}

          {/* Add task */}
          {showAdd ? (
            <div className="flex flex-col gap-2 pt-2 animate-fade-in">
              <input
                autoFocus
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !showRecurrence && handleAdd()}
                placeholder="Descreva a tarefa..."
                className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border text-muted-foreground"
                />
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border text-muted-foreground"
                />
                <button
                  onClick={() => setShowRecurrence(!showRecurrence)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showRecurrence ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                >
                  🔄 Recorrente
                </button>
              </div>

              {showRecurrence && (
                <div className="bg-secondary/40 rounded-lg p-3 space-y-3 animate-fade-in border border-border">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Tipo:</label>
                    <select
                      value={recType}
                      onChange={e => setRecType(e.target.value as "weekly" | "monthly")}
                      className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>

                  {recType === "weekly" ? (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Dias da semana:</label>
                      <div className="flex gap-1">
                        {DAYS_OF_WEEK.map(d => (
                          <button
                            key={d.value}
                            onClick={() => toggleDay(d.value)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              recDays.includes(d.value) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Dia do mês:</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={recDayOfMonth}
                        onChange={e => setRecDayOfMonth(Number(e.target.value))}
                        className="bg-secondary rounded-md px-2 py-1 text-xs w-16 border-none outline-none text-foreground"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Antecedência (dias):</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={recAdvance}
                      onChange={e => setRecAdvance(Number(e.target.value))}
                      className="bg-secondary rounded-md px-2 py-1 text-xs w-16 border-none outline-none text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1" />
                <button
                  onClick={() => { setShowAdd(false); setNewTask(""); setNewDate(""); setNewTime(""); setShowRecurrence(false); }}
                  className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdd}
                  className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova tarefa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
