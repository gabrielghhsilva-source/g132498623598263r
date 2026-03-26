import { useState } from "react";
import { Plus, X } from "lucide-react";

const ICONS = ["📁", "🎯", "📚", "🏋️", "🎨", "🎵", "✈️", "🛒", "💡", "🔧", "📱", "🎓", "❤️", "🌱", "🐾"];

interface Props {
  onAdd: (name: string, icon: string) => void;
}

export function AddAreaDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), icon);
    setName("");
    setIcon("📁");
    setOpen(false);
  };

  if (!open) {
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
    <div className="glass-card rounded-xl p-4 animate-fade-in space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Nova Área</h3>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-accent">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
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
        className="w-full px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
      >
        Criar Área
      </button>
    </div>
  );
}
