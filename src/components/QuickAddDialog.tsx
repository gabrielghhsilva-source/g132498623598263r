import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TaskTag, TaskPriority, TaskTemplate } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";
import { PrioritySelect } from "./PrioritySelect";
import { TagPicker } from "./TagPicker";
import { VoiceRecorderButton } from "./VoiceRecorderButton";
import { Plus, X, Copy, Trash2, Repeat } from "lucide-react";

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
  templates?: TaskTemplate[];
  onDeleteTemplate?: (id: string) => void;
}

type RepeatMode = "none" | "daily" | "weekly" | "monthly";
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function QuickAddDialog({ open, onOpenChange, areas, defaultAreaId, tags, onSubmit, onAddTag, onDeleteTag, templates = [], onDeleteTemplate }: Props) {
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
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

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
      setRepeatMode("none");
      setRepeatDays([]);
    }
  }, [open, defaultAreaId, areas]);

  const applyTemplate = (tpl: TaskTemplate) => {
    setAreaId(tpl.areaId && areas.some(a => a.id === tpl.areaId) ? tpl.areaId : (defaultAreaId || areas[0]?.id || ""));
    setText(tpl.text);
    setDueTime(tpl.dueTime || "");
    setEndTime(tpl.endTime || "");
    setShowEnd(!!tpl.endTime);
    setPriority(tpl.priority || "none");
    setTagIds([...(tpl.tagIds || [])]);
    setSubtasksText((tpl.subtasks || []).map(s => s.text).join("\n"));
    if (tpl.recurrence?.type === "weekly") {
      const days = tpl.recurrence.daysOfWeek || [];
      setRepeatMode(days.length === 7 ? "daily" : "weekly");
      setRepeatDays(days);
    } else if (tpl.recurrence?.type === "monthly") {
      setRepeatMode("monthly");
      setRepeatDays([]);
    } else {
      setRepeatMode("none");
      setRepeatDays([]);
    }
  };

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
      recurrence: buildRecurrence(repeatMode, repeatDays, dueDate),
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
          {templates.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/20 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                <Copy className="w-3.5 h-3.5" /> Templates rápidos
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {templates.slice(0, 8).map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="group flex items-center gap-1.5 max-w-44 flex-shrink-0 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs hover:border-primary/50 hover:bg-primary/5"
                    title="Usar template"
                  >
                    <span className="truncate">{tpl.name}</span>
                    {onDeleteTemplate && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}
                        className="opacity-50 group-hover:opacity-100 text-destructive"
                        title="Excluir template"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {!showEnd ? (
            <button
              type="button"
              onClick={() => setShowEnd(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              + adicionar horário de fim (intervalo)
            </button>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3 bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Fim do intervalo</span>
                <button
                  type="button"
                  onClick={() => { setShowEnd(false); setEndDate(""); setEndTime(""); }}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  remover
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> Repetição na agenda
            </label>
            <select
              value={repeatMode}
              onChange={e => setRepeatMode(e.target.value as RepeatMode)}
              className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            >
              <option value="none">Não repetir</option>
              <option value="daily">Todos os dias</option>
              <option value="weekly">Dias da semana</option>
              <option value="monthly">Todo mês</option>
            </select>
            {repeatMode === "weekly" && (
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, index) => {
                  const active = repeatDays.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRepeatDays(prev => active ? prev.filter(d => d !== index) : [...prev, index].sort())}
                      className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {repeatMode !== "none" && (
              <p className="text-[10px] text-muted-foreground">
                A tarefa fica sempre na agenda na próxima data. Ao concluir, uma cópia vai para Prontas e a original avança automaticamente.
              </p>
            )}
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

function buildRecurrence(mode: RepeatMode, days: number[], dueDate: string): AddTaskInput["recurrence"] {
  if (mode === "daily") return { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], advanceDays: 0 };
  if (mode === "weekly") return { type: "weekly", daysOfWeek: days.length ? days : [new Date((dueDate || new Date().toISOString().split("T")[0]) + "T12:00:00").getDay()], advanceDays: 0 };
  if (mode === "monthly") return { type: "monthly", dayOfMonth: new Date((dueDate || new Date().toISOString().split("T")[0]) + "T12:00:00").getDate(), advanceDays: 0 };
  return undefined;
}
