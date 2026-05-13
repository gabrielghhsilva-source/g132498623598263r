import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TaskTag, TaskPriority } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";
import { PrioritySelect } from "./PrioritySelect";
import { TagPicker } from "./TagPicker";
import { VoiceRecorderButton } from "./VoiceRecorderButton";
import { Plus, X } from "lucide-react";

interface AreaOption { id: string; name: string; icon: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  areas: AreaOption[];
  defaultAreaId?: string;
  tags: TaskTag[];
  onSubmit: (areaId: string, input: AddTaskInput) => void;
  onAddTag: (name: string, color: string) => TaskTag;
  onDeleteTag: (id: string) => void;
}

export function QuickAddDialog({ open, onOpenChange, areas, defaultAreaId, tags, onSubmit, onAddTag, onDeleteTag }: Props) {
  const [areaId, setAreaId] = useState(defaultAreaId || areas[0]?.id || "");
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showEnd, setShowEnd] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [subtasksText, setSubtasksText] = useState("");

  useEffect(() => {
    if (open) {
      setAreaId(defaultAreaId || areas[0]?.id || "");
      setText("");
      setDueDate("");
      setDueTime("");
      setEndDate("");
      setEndTime("");
      setShowEnd(false);
      setPriority("none");
      setTagIds([]);
      setSubtasksText("");
    }
  }, [open, defaultAreaId, areas]);

  const handleSubmit = () => {
    if (!text.trim() || !areaId) return;
    const subtasks = subtasksText
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ text: s }));
    onSubmit(areaId, {
      text: text.trim(),
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      priority,
      tagIds,
      subtasks,
    });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova tarefa
          </DialogTitle>
          <DialogDescription className="text-xs">
            Atalho: <kbd className="px-1 py-0.5 rounded bg-secondary text-[10px]">Ctrl/⌘ + Enter</kbd> pra criar rapidinho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Título * <span className="text-muted-foreground/70">— ou clique no microfone para ditar</span>
            </label>
            <div className="flex items-stretch gap-2">
              <input
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Descreva a tarefa..."
                className="flex-1 bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40"
              />
              <VoiceRecorderButton
                onTranscribed={(t) => setText(prev => (prev ? prev + " " + t : t))}
                label="Ditar título da tarefa"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Área</label>
            <select
              value={areaId}
              onChange={e => setAreaId(e.target.value)}
              className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
            >
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Horário</label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Etiquetas</label>
            <TagPicker
              allTags={tags}
              selectedIds={tagIds}
              onChange={setTagIds}
              onCreateTag={onAddTag}
              onDeleteTag={onDeleteTag}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Subtarefas (uma por linha)
            </label>
            <textarea
              value={subtasksText}
              onChange={e => setSubtasksText(e.target.value)}
              placeholder={`Ex.:\nFazer briefing\nEnviar pro cliente\nRevisar feedback`}
              rows={3}
              className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-2 text-xs rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <X className="w-3 h-3 inline mr-1" /> Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Criar tarefa
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
