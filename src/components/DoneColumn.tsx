import { useEffect, useState } from "react";
import { Task, TaskTag, TaskArea } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { CheckCircle2, EyeOff, Eye } from "lucide-react";

interface DoneTaskWithOrigin extends Task {
  __originAreaId: string;
  __originAreaName: string;
  __originAreaIcon: string;
}

interface Props {
  areas: TaskArea[];
  tags: TaskTag[];
  timezone: string;
  draggingTaskId: string | null;
  dragOverColumnId: string | null;
  onTaskClick: (areaId: string, task: Task) => void;
  onMarkUndone: (areaId: string, taskId: string) => void;
  /** Quando uma task é solta na coluna, marca como done. */
  onDropDone: () => void;
  onDragOverColumn: () => void;
}

const COLUMN_ID = "__done__";
export const DONE_COLUMN_ID = COLUMN_ID;

export function DoneColumn({
  areas, tags, timezone, draggingTaskId, dragOverColumnId,
  onTaskClick, onMarkUndone, onDropDone, onDragOverColumn,
}: Props) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem("kanban-hide-done") === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("kanban-hide-done", hidden ? "1" : "0"); } catch {}
  }, [hidden]);

  const doneTasks: DoneTaskWithOrigin[] = areas.flatMap(area =>
    area.tasks
      .filter(t => t.status === "done")
      .map(t => ({
        ...t,
        __originAreaId: area.id,
        __originAreaName: area.name,
        __originAreaIcon: area.icon,
      }))
  );

  const isDragOver = dragOverColumnId === COLUMN_ID && draggingTaskId !== null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="flex flex-col items-center justify-center gap-2 w-12 flex-shrink-0 rounded-xl border-2 border-dashed border-success/40 text-success hover:bg-success/5 transition-colors"
        title="Mostrar coluna Prontas"
        aria-label="Mostrar coluna Prontas"
      >
        <Eye className="w-4 h-4" />
        <span className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180">Prontas ({doneTasks.length})</span>
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col w-72 sm:w-80 flex-shrink-0 rounded-xl glass-card transition-all duration-200 ${
        isDragOver ? "ring-2 ring-success/60 scale-[1.01]" : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOverColumn(); }}
      onDrop={(e) => { e.preventDefault(); onDropDone(); }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <h3 className="font-semibold text-sm truncate">Prontas</h3>
          <span className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
            {doneTasks.length}
          </span>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Ocultar coluna"
          aria-label="Ocultar coluna Prontas"
        >
          <EyeOff className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div data-kanban-column-scroll className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
        {doneTasks.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            Nenhuma tarefa concluída ainda. Marque uma como feita e ela aparece aqui.
          </div>
        )}

        {doneTasks.map(task => (
          <div key={`${task.__originAreaId}-${task.id}`} className="space-y-1">
            <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
              <span>{task.__originAreaIcon}</span>
              <span className="truncate">{task.__originAreaName}</span>
            </div>
            <KanbanCard
              task={task}
              tags={tags}
              timezone={timezone}
              isDragging={draggingTaskId === task.id}
              onClick={() => onTaskClick(task.__originAreaId, task)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", task.id);
              }}
              onDragEnd={() => {}}
              onQuickToggleDone={() => onMarkUndone(task.__originAreaId, task.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
