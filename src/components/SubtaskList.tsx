import { useState } from "react";
import { Subtask } from "@/lib/types";
import { Plus, X, Check, Square } from "lucide-react";

interface Props {
  subtasks: Subtask[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText?: (id: string, text: string) => void;
  compact?: boolean;
}

export function SubtaskList({ subtasks, onAdd, onToggle, onDelete, onUpdateText, compact }: Props) {
  const [newText, setNewText] = useState("");

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd(newText.trim());
    setNewText("");
  };

  const doneCount = subtasks.filter(s => s.done).length;

  return (
    <div className="space-y-1.5">
      {subtasks.length > 0 && !compact && (
        <div className="text-xs text-muted-foreground">
          {doneCount}/{subtasks.length} concluídas
        </div>
      )}

      {subtasks.map(s => (
        <div key={s.id} className="flex items-center gap-2 group/sub bg-secondary/30 rounded-md px-2 py-1.5">
          <button
            type="button"
            onClick={() => onToggle(s.id)}
            className="flex-shrink-0"
            aria-label={s.done ? "Desmarcar subtarefa" : "Marcar subtarefa"}
          >
            {s.done ? (
              <div className="w-4 h-4 rounded bg-success flex items-center justify-center">
                <Check className="w-3 h-3 text-success-foreground" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {onUpdateText ? (
            <input
              value={s.text}
              onChange={e => onUpdateText(s.id, e.target.value)}
              className={`flex-1 bg-transparent border-none outline-none text-xs ${s.done ? "line-through opacity-60" : ""}`}
            />
          ) : (
            <span className={`flex-1 text-xs ${s.done ? "line-through opacity-60" : ""}`}>{s.text}</span>
          )}
          <button
            type="button"
            onClick={() => onDelete(s.id)}
            className="opacity-0 group-hover/sub:opacity-60 hover:!opacity-100 transition-opacity p-0.5"
            aria-label="Excluir subtarefa"
          >
            <X className="w-3 h-3 text-destructive" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Adicionar subtarefa..."
          className="flex-1 bg-secondary/40 rounded-md px-2 py-1 text-xs outline-none border border-transparent focus:border-primary/40 placeholder:text-muted-foreground"
        />
        {newText.trim() && (
          <button
            type="button"
            onClick={handleAdd}
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}

export function SubtaskProgressBadge({ subtasks }: { subtasks: Subtask[] }) {
  if (subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.done).length;
  const pct = subtasks.length === 0 ? 0 : (done / subtasks.length) * 100;
  const allDone = done === subtasks.length;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
        <Check className="w-3 h-3" />
        <span>{done}/{subtasks.length}</span>
      </div>
      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${allDone ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
