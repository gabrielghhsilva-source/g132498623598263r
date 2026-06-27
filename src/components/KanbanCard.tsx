import { memo } from "react";
import { Task, TaskTag, TaskStatus, PRIORITY_META } from "@/lib/types";
import { isTaskOverdue } from "@/lib/timeUtils";
import { TagBadges } from "./TagPicker";
import { PriorityBadge } from "./PrioritySelect";
import { SubtaskProgressBadge } from "./SubtaskList";
import { MessageSquare, Calendar, Clock, Repeat, Check } from "lucide-react";

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-muted-foreground/40",
  "in-progress": "bg-info",
  done: "bg-success",
};

interface Props {
  task: Task;
  tags: TaskTag[];
  timezone: string;
  isDragging?: boolean;
  isSelected?: boolean;
  selectionActive?: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onQuickToggleDone: () => void;
  onToggleSelect?: (additive: boolean) => void;
}

function KanbanCardImpl({ task, tags, timezone, isDragging, isSelected, selectionActive, onClick, onDragStart, onDragEnd, onQuickToggleDone, onToggleSelect }: Props) {
  const isOverdue = isTaskOverdue(task.dueDate, task.dueTime, task.status, timezone);
  const taskTags = tags.filter(t => task.tagIds?.includes(t.id));
  const priority = task.priority || "none";
  const priorityColor = PRIORITY_META[priority].color;

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect?.(true);
      return;
    }
    if (selectionActive) {
      onToggleSelect?.(true);
      return;
    }
    onClick();
  };

  return (
    <div
      data-kanban-card
      draggable={!selectionActive}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      className={`group relative fut-surface rounded-lg border bg-card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
        isDragging ? "opacity-40 scale-95" : ""
      } ${isSelected ? "ring-2 ring-primary border-primary" : task.status === "done" ? "border-success/30" : isOverdue ? "border-destructive/40" : "border-border"}`}
    >
      {/* Selection checkbox: visible on hover/selection */}
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(true); }}
          className={`absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full border flex items-center justify-center transition-opacity ${
            isSelected
              ? "bg-primary border-primary opacity-100"
              : "bg-card border-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:border-primary"
          }`}
          title={isSelected ? "Desmarcar" : "Selecionar (ou shift+click no card)"}
          aria-label="Selecionar tarefa"
        >
          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </button>
      )}
      {/* Priority strip on the left */}
      {priority !== "none" && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
          style={{ backgroundColor: priorityColor }}
          aria-hidden
        />
      )}

      <div className="p-3 space-y-2 pl-3.5">
        {/* Top: priority + tags */}
        {(priority !== "none" || taskTags.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityBadge priority={priority} />
            <TagBadges tags={taskTags} max={3} />
          </div>
        )}

        {/* Title */}
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickToggleDone(); }}
            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
              task.status === "done" ? "bg-success border-success" : "border-muted-foreground/40 hover:border-primary"
            }`}
            aria-label={task.status === "done" ? "Marcar como pendente" : "Marcar como feita"}
          >
            {task.status === "done" && <Check className="w-3 h-3 text-success-foreground" />}
          </button>
          <p className={`flex-1 text-sm leading-snug ${task.status === "done" ? "line-through opacity-60" : "text-foreground"}`}>
            {task.text || <span className="text-muted-foreground italic">Sem título</span>}
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-semibold" : ""}`}>
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                {task.dueTime && (
                  <>
                    <Clock className="w-3 h-3 ml-0.5" />
                    {task.dueTime}
                  </>
                )}
                {(task.endDate || task.endTime) && (
                  <>
                    <span className="mx-0.5 opacity-60">→</span>
                    {task.endDate && task.endDate !== task.dueDate && (
                      <>{new Date(task.endDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</>
                    )}
                    {task.endTime && (
                      <span className="ml-0.5">{task.endTime}</span>
                    )}
                  </>
                )}
              </span>
            )}
            {task.recurrence && (
              <span className="flex items-center gap-0.5 text-info">
                <Repeat className="w-3 h-3" />
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {task.comments.length}
              </span>
            )}
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <SubtaskProgressBadge subtasks={task.subtasks} />
          )}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[task.status]}`} />
          <span>{task.status === "todo" ? "A fazer" : task.status === "in-progress" ? "Em progresso" : "Feita"}</span>
        </div>
      </div>
    </div>
  );
}

export const KanbanCard = memo(KanbanCardImpl);
