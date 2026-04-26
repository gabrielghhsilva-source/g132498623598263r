import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

const ICONS = ["📁", "🎯", "📚", "🏋️", "🎨", "🎵", "✈️", "🛒", "💡", "🔧", "📱", "🎓", "❤️", "🌱", "🐾"];

interface Props {
  onAdd: (name: string, icon: string) => void;
  /** Controlled mode: when provided, replaces internal trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function AddAreaDialog({ onAdd, open: controlledOpen, onOpenChange, hideTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");

  useEffect(() => {
    if (!open) {
      setName("");
      setIcon("📁");
    }
  }, [open]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), icon);
    setOpen(false);
  };

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nova Área
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
      <div className="glass-card rounded-xl p-4 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Nova Área</h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-accent" aria-label="Fechar">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ícone</label>
          <div className="flex flex-wrap gap-1">
            {ICONS.map(i => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-colors ${
                  icon === i ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-accent"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Nome da área..."
          className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="w-full px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium disabled:opacity-40"
        >
          Criar Área
        </button>
      </div>
    </div>
  );
}
