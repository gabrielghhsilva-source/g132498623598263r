import { useState } from "react";
import { TaskTag } from "@/lib/types";
import { Tag as TagIcon, X, Plus, Check } from "lucide-react";

interface Props {
  allTags: TaskTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (name: string, color: string) => TaskTag;
  onDeleteTag?: (id: string) => void;
}

const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

export function TagPicker({ allTags, selectedIds, onChange, onCreateTag, onDeleteTag }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const tag = onCreateTag(newName.trim(), newColor);
    onChange([...selectedIds, tag.id]);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {allTags.length === 0 && <p className="text-xs text-muted-foreground">Sem etiquetas ainda.</p>}
        {allTags.map(tag => {
          const active = selectedIds.includes(tag.id);
          return (
            <div key={tag.id} className="flex items-center group/tag">
              <button
                type="button"
                onClick={() => toggle(tag.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  active ? "ring-1 ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: `${tag.color}25`,
                  color: tag.color,
                  ...(active ? { boxShadow: `0 0 0 1px ${tag.color}` } : {}),
                }}
              >
                {active && <Check className="w-3 h-3" />}
                {tag.name}
              </button>
              {onDeleteTag && (
                <button
                  type="button"
                  onClick={() => onDeleteTag(tag.id)}
                  className="opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 ml-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive transition-opacity"
                  aria-label={`Excluir etiqueta ${tag.name}`}
                  title="Excluir etiqueta"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2 bg-secondary/40 rounded-lg p-2 animate-fade-in">
          <TagIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Nome da etiqueta"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <div className="flex gap-1">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full ${newColor === c ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
                style={{ backgroundColor: c, ...(newColor === c ? { boxShadow: `0 0 0 1px ${c}` } : {}) }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Criar
          </button>
          <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function TagBadges({ tags, max = 3 }: { tags: TaskTag[]; max?: number }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const extra = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(t => (
        <span
          key={t.id}
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ backgroundColor: `${t.color}25`, color: t.color }}
        >
          {t.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
