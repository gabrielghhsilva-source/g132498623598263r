import { TaskArea } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { TaskStatus, TaskTextStyle } from "@/lib/types";

interface Props {
  area: TaskArea;
  onToggleCollapse: () => void;
  onAddTask: (text: string, dueDate?: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateStyle: (taskId: string, style: Partial<TaskTextStyle>) => void;
  onUpdateText: (taskId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskAreaCard({ area, onToggleCollapse, onAddTask, onUpdateStatus, onUpdateStyle, onUpdateText, onDeleteTask }: Props) {
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const doneCount = area.tasks.filter(t => t.status === "done").length;
  const totalCount = area.tasks.length;

  const handleAdd = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask.trim(), newDate || undefined);
    setNewTask("");
    setNewDate("");
    setShowAdd(false);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{area.icon}</span>
          <h2 className="text-lg font-semibold">{area.name}</h2>
          {totalCount > 0 && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-medium">
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
        {area.collapsed ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {!area.collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {area.tasks.length === 0 && !showAdd && (
            <p className="text-sm text-muted-foreground py-3 text-center">
              Nenhuma tarefa ainda
            </p>
          )}

          {area.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={s => onUpdateStatus(task.id, s)}
              onStyleChange={s => onUpdateStyle(task.id, s)}
              onTextChange={t => onUpdateText(task.id, t)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}

          {/* Add task */}
          {showAdd ? (
            <div className="flex flex-col gap-2 pt-2 animate-fade-in">
              <input
                autoFocus
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="Descreva a tarefa..."
                className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border text-muted-foreground"
                />
                <div className="flex-1" />
                <button
                  onClick={() => { setShowAdd(false); setNewTask(""); setNewDate(""); }}
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
