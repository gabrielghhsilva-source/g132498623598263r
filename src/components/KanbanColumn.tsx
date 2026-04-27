import { useState } from "react";
import { TaskArea, TaskTag, Task } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { Plus, MoreVertical, Trash2, X } from "lucide-react";

interface Props {
  area: TaskArea;
  tags: TaskTag[];
  timezone: string;
  isCustom: boolean;
  draggingTaskId: string | null;
  dragOverColumnId: string | null;
  onTaskClick: (task: Task) => void;
  onQuickAdd: (text: string) => void;
  onQuickToggleDone: (taskId: string) => void;
  onDeleteArea?: () => void;
  onDragStart: (taskId: string, fromAreaId: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: () => void;
  onDropOnColumn: () => void;
}

export function KanbanColumn({
  area, tags, timezone, isCustom, draggingTaskId, dragOverColumnId,
  onTaskClick, onQuickAdd, onQuickToggleDone, onDeleteArea,
  onDragStart, onDragEnd, onDragOverColumn, onDropOnColumn,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const handleQuickAdd = () => {
    if (!quickText.trim()) {
      setAdding(false);
      return;
    }
    onQuickAdd(quickText.trim());
    setQuickText("");
  };

  const isDragOver = dragOverColumnId === area.id && draggingTaskId !== null;
  const doneCount = area.tasks.filter(t => t.status === "done").length;

  return (
    <div
      className={`flex flex-col w-72 sm:w-80 flex-shrink-0 rounded-xl glass-card transition-all duration-200 ${
        isDragOver ? "ring-2 ring-primary/60 scale-[1.01]" : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOverColumn(); }}
      onDrop={(e) => { e.preventDefault(); onDropOnColumn(); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{area.icon}</span>
          <h3 className="font-semibold text-sm truncate">{area.name}</h3>
          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground font-medium flex-shrink-0">
            {area.tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setAdding(true)}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Nova tarefa"
            aria-label={`Nova tarefa em ${area.name}`}
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          {isCustom && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-accent transition-colors"
                aria-label={`Opções de ${area.name}`}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-30 animate-scale-in min-w-[140px]">
                  <button
                    onClick={() => { onDeleteArea?.(); setShowMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir área
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {area.tasks.length > 0 && (
        <div className="px-3 pt-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${(doneCount / area.tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
        {area.tasks.length === 0 && !adding && (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            Sem tarefas. Clique em + pra adicionar.
          </div>
        )}

        {area.tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            tags={tags}
            timezone={timezone}
            isDragging={draggingTaskId === task.id}
            onClick={() => onTaskClick(task)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", task.id);
              onDragStart(task.id, area.id);
            }}
            onDragEnd={onDragEnd}
            onQuickToggleDone={() => onQuickToggleDone(task.id)}
          />
        ))}

        {/* Quick add inline */}
        {adding && (
          <div className="bg-card border border-primary/40 rounded-lg p-2 animate-fade-in">
            <textarea
              autoFocus
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAdd();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setQuickText("");
                }
              }}
              placeholder="Título da tarefa..."
              rows={2}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <button
                onClick={() => { setAdding(false); setQuickText(""); }}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
                aria-label="Cancelar"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={!quickText.trim()}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors border-t border-border/50 rounded-b-xl"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
        </button>
      )}
    </div>
  );
}
