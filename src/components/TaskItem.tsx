import { Task, TaskStatus, TaskTextStyle } from "@/lib/types";
import { Check, Clock, Pause, Trash2, ChevronDown, Type, Bold, Paintbrush } from "lucide-react";
import { useState } from "react";

const SIZE_MAP = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };
const WEIGHT_MAP = { light: "font-light", normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Check; badgeClass: string }> = {
  done: { label: "Feita", icon: Check, badgeClass: "bg-success/15 text-success" },
  "in-progress": { label: "Em progresso", icon: Clock, badgeClass: "bg-info/15 text-info" },
  todo: { label: "A fazer", icon: Pause, badgeClass: "bg-muted text-muted-foreground" },
};

interface Props {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onStyleChange: (style: Partial<TaskTextStyle>) => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
}

export function TaskItem({ task, onStatusChange, onStyleChange, onTextChange, onDelete }: Props) {
  const [showStyle, setShowStyle] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[task.status];
  const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();

  return (
    <div className={`group rounded-lg border px-4 py-3 transition-all animate-fade-in ${
      task.status === "done" ? "border-success/20 bg-success/5" : isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
    }`}>
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <div className="relative mt-0.5">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${statusCfg.badgeClass}`}
          >
            <statusCfg.icon className="w-3 h-3" />
            {statusCfg.label}
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
          {task.dueDate && (
            <p className={`text-xs mt-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {isOverdue ? "⚠ Atrasada — " : ""}Prazo: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowStyle(!showStyle)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Estilo">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Excluir">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      {/* Style editor */}
      {showStyle && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Type className="w-3 h-3" />
            <select
              value={task.style.size}
              onChange={e => onStyleChange({ size: e.target.value as TaskTextStyle["size"] })}
              className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground"
            >
              <option value="sm">Pequeno</option>
              <option value="base">Normal</option>
              <option value="lg">Grande</option>
              <option value="xl">Extra grande</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bold className="w-3 h-3" />
            <select
              value={task.style.weight}
              onChange={e => onStyleChange({ weight: e.target.value as TaskTextStyle["weight"] })}
              className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground"
            >
              <option value="light">Leve</option>
              <option value="normal">Normal</option>
              <option value="medium">Médio</option>
              <option value="semibold">Seminegrito</option>
              <option value="bold">Negrito</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paintbrush className="w-3 h-3" />
            <input
              type="color"
              value={task.style.color}
              onChange={e => onStyleChange({ color: e.target.value })}
              className="w-6 h-6 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
