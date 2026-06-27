import { useState } from "react";
import { TaskArea } from "@/lib/types";
import { CheckCircle2, Trash2, ArrowRight, X, MoveRight } from "lucide-react";

interface Props {
  count: number;
  areas: TaskArea[];
  onClear: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onMoveTo: (areaId: string) => void;
}

export function BulkActionBar({ count, areas, onClear, onComplete, onDelete, onMoveTo }: Props) {
  const [moveOpen, setMoveOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 backdrop-blur-md shadow-lg px-2 py-1.5">
        <span className="text-xs font-semibold px-2 text-foreground">
          {count} selecionada{count > 1 ? "s" : ""}
        </span>
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs hover:bg-success/10 text-success transition-colors"
          title="Concluir"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
        </button>
        <div className="relative">
          <button
            onClick={() => setMoveOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs hover:bg-accent transition-colors"
            title="Mover para área"
          >
            <MoveRight className="w-3.5 h-3.5" /> Mover
          </button>
          {moveOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-lg shadow-lg min-w-[180px] py-1 max-h-64 overflow-y-auto">
              {areas.map(a => (
                <button
                  key={a.id}
                  onClick={() => { onMoveTo(a.id); setMoveOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent text-left"
                >
                  <span>{a.icon}</span>
                  <span className="truncate">{a.name}</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs hover:bg-destructive/10 text-destructive transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </button>
        <button
          onClick={onClear}
          className="p-1.5 rounded-full hover:bg-accent text-muted-foreground"
          title="Limpar seleção (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
