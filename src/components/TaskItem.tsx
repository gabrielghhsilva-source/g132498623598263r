import React, { useState } from "react";
import { Task, TaskStatus, TaskTextStyle } from "@/lib/types";
import { isTaskOverdue, getNowInTimezone } from "@/lib/timeUtils";
import { Check, Clock, Pause, Trash2, ChevronDown, Type, Bold, Paintbrush, MessageSquare, Send, X, Clock3 } from "lucide-react";

const SIZE_MAP = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };
const WEIGHT_MAP = { light: "font-light", normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Check; badgeClass: string }> = {
  done: { label: "Feita", icon: Check, badgeClass: "bg-success/15 text-success" },
  "in-progress": { label: "Em progresso", icon: Clock, badgeClass: "bg-info/15 text-info" },
  todo: { label: "A fazer", icon: Pause, badgeClass: "bg-muted text-muted-foreground" },
};

interface Props {
  task: Task;
  timezone: string;
  onStatusChange: (status: TaskStatus) => void;
  onStyleChange: (style: Partial<TaskTextStyle>) => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onTimeChange?: (dueTime: string | undefined, dueDate?: string) => void;
}

export function TaskItem({ task, timezone, onStatusChange, onStyleChange, onTextChange, onDelete, onAddComment, onDeleteComment, onTimeChange }: Props) {
  const [showStyle, setShowStyle] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [newComment, setNewComment] = useState("");
  const statusCfg = STATUS_CONFIG[task.status];
  const isOverdue = isTaskOverdue(task.dueDate, task.dueTime, task.status, timezone);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleTimeChange = (time: string) => {
    if (!onTimeChange) return;
    const date = task.dueDate || getNowInTimezone(timezone).date;
    onTimeChange(time || undefined, date);
  };

  return (
    <div className={`group rounded-lg border px-3 sm:px-4 py-3 transition-all duration-200 animate-fade-in ${
      task.status === "done" ? "border-success/20 bg-success/5" : isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
    }`}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Status toggle */}
        <div className="relative mt-0.5 flex-shrink-0">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusCfg.badgeClass}`}
          >
            <statusCfg.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{statusCfg.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg p-1 z-30 animate-scale-in min-w-[130px]">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); setStatusOpen(false); }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors ${
                    task.status === s ? "bg-accent font-semibold" : "hover:bg-accent/50"
                  }`}
                >
                  {React.createElement(STATUS_CONFIG[s].icon, { className: "w-3 h-3" })}
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task text */}
        <div className="flex-1 min-w-0">
          <input
            value={task.text}
            onChange={e => onTextChange(e.target.value)}
            className={`w-full bg-transparent border-none outline-none ${SIZE_MAP[task.style.size]} ${WEIGHT_MAP[task.style.weight]} ${
              task.status === "done" ? "line-through opacity-60" : ""
            }`}
            style={{ color: task.style.color }}
          />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.dueDate && (
              <p className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {isOverdue ? "⚠ Atrasada — " : ""}Prazo: {new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                {task.dueTime && ` às ${task.dueTime}`}
              </p>
            )}
            {task.recurrence && (
              <span className="text-xs bg-info/10 text-info px-1.5 py-0.5 rounded">
                🔄 {task.recurrence.type === "weekly" ? "Semanal" : "Mensal"}
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="text-xs text-muted-foreground">
                💬 {task.comments.length}
              </span>
            )}
          </div>
        </div>

        {/* Actions — always visible on mobile (no hover), fade-in on desktop hover */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          {onTimeChange && (
            <button onClick={() => setShowTime(!showTime)} className="p-2 sm:p-1.5 rounded-md hover:bg-accent transition-colors" title="Definir horário" aria-label="Definir horário">
              <Clock3 className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${task.dueTime ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          )}
          <button onClick={() => setShowComments(!showComments)} className="p-2 sm:p-1.5 rounded-md hover:bg-accent transition-colors" title="Comentários" aria-label="Comentários">
            <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setShowStyle(!showStyle)} className="p-2 sm:p-1.5 rounded-md hover:bg-accent transition-colors" title="Estilo" aria-label="Estilo">
            <Type className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 sm:p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Excluir" aria-label="Excluir">
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      {/* Time editor */}
      {showTime && onTimeChange && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="w-3 h-3" />
            <span>Horário:</span>
            <input
              type="time"
              value={task.dueTime || ""}
              onChange={e => handleTimeChange(e.target.value)}
              className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground"
            />
            {task.dueTime && (
              <button
                onClick={() => onTimeChange(undefined, task.dueDate)}
                className="text-xs text-destructive hover:underline"
              >
                Remover
              </button>
            )}
          </div>
          {!task.dueDate && (
            <span className="text-xs text-muted-foreground">Definir horário também marcará a data como hoje.</span>
          )}
        </div>
      )}

      {/* Style editor */}
      {showStyle && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Type className="w-3 h-3" />
            <select value={task.style.size} onChange={e => onStyleChange({ size: e.target.value as TaskTextStyle["size"] })} className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground">
              <option value="sm">Pequeno</option>
              <option value="base">Normal</option>
              <option value="lg">Grande</option>
              <option value="xl">Extra grande</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bold className="w-3 h-3" />
            <select value={task.style.weight} onChange={e => onStyleChange({ weight: e.target.value as TaskTextStyle["weight"] })} className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground">
              <option value="light">Leve</option>
              <option value="normal">Normal</option>
              <option value="medium">Médio</option>
              <option value="semibold">Seminegrito</option>
              <option value="bold">Negrito</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paintbrush className="w-3 h-3" />
            <input type="color" value={task.style.color} onChange={e => onStyleChange({ color: e.target.value })} className="w-6 h-6 rounded border border-border cursor-pointer" />
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in space-y-2">
          {task.comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 bg-secondary/50 rounded-md px-3 py-2">
              <p className="flex-1 text-xs text-foreground">{c.text}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <button onClick={() => onDeleteComment(c.id)} className="text-destructive hover:text-destructive/80">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddComment()}
              placeholder="Adicionar comentário..."
              className="flex-1 bg-secondary/60 rounded-md px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40 transition-colors text-foreground placeholder:text-muted-foreground"
            />
            <button onClick={handleAddComment} className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
