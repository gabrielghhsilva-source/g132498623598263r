import React, { useState } from "react";
import { Task, TaskStatus, TaskTag, TaskPriority, TaskTextStyle } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PrioritySelect } from "./PrioritySelect";
import { TagPicker } from "./TagPicker";
import { SubtaskList } from "./SubtaskList";
import { Trash2, Calendar, Clock, MessageSquare, Send, X, Type, Bold, Paintbrush, Move } from "lucide-react";

const SIZE_MAP = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };
const WEIGHT_MAP = { light: "font-light", normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };

interface AreaOption { id: string; name: string; icon: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  areaId: string | null;
  areas: AreaOption[];
  tags: TaskTag[];
  onUpdateText: (text: string) => void;
  onUpdateStatus: (s: TaskStatus) => void;
  onUpdateStyle: (s: Partial<TaskTextStyle>) => void;
  onUpdateTime: (time: string | undefined, date?: string) => void;
  onUpdateDate: (date: string | undefined) => void;
  onUpdateEnd: (endDate: string | undefined, endTime: string | undefined) => void;
  onUpdatePriority: (p: TaskPriority) => void;
  onUpdateTags: (ids: string[]) => void;
  onAddTag: (name: string, color: string) => TaskTag;
  onDeleteTag: (id: string) => void;
  onAddSubtask: (text: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateSubtaskText: (id: string, text: string) => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (id: string) => void;
  onMove: (toAreaId: string) => void;
  onDelete: () => void;
}

export function TaskDetailDialog(props: Props) {
  const { open, onOpenChange, task, areaId, areas, tags } = props;
  const [newComment, setNewComment] = useState("");

  if (!task || !areaId) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    props.onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
          <DialogDescription className="sr-only">Editar todos os detalhes da tarefa</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
            <input
              autoFocus
              value={task.text}
              onChange={e => props.onUpdateText(e.target.value)}
              className={`w-full bg-secondary/40 rounded-lg px-3 py-2 outline-none border border-border focus:border-primary/40 ${SIZE_MAP[task.style.size]} ${WEIGHT_MAP[task.style.weight]}`}
              style={{ color: task.style.color }}
              placeholder="Descreva a tarefa..."
            />
          </div>

          {/* Status + Move */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={task.status}
                onChange={e => props.onUpdateStatus(e.target.value as TaskStatus)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              >
                <option value="todo">A fazer</option>
                <option value="in-progress">Em progresso</option>
                <option value="done">Feita</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Move className="w-3 h-3" /> Mover para área
              </label>
              <select
                value={areaId}
                onChange={e => props.onMove(e.target.value)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
            <PrioritySelect value={task.priority || "none"} onChange={props.onUpdatePriority} />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Etiquetas</label>
            <TagPicker
              allTags={tags}
              selectedIds={task.tagIds || []}
              onChange={props.onUpdateTags}
              onCreateTag={props.onAddTag}
              onDeleteTag={props.onDeleteTag}
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data de vencimento
              </label>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={e => props.onUpdateDate(e.target.value || undefined)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horário
              </label>
              <input
                type="time"
                value={task.dueTime || ""}
                onChange={e => props.onUpdateTime(e.target.value || undefined, task.dueDate)}
                className="w-full bg-secondary/40 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subtarefas</label>
            <SubtaskList
              subtasks={task.subtasks || []}
              onAdd={props.onAddSubtask}
              onToggle={props.onToggleSubtask}
              onDelete={props.onDeleteSubtask}
              onUpdateText={props.onUpdateSubtaskText}
            />
          </div>

          {/* Style */}
          <details className="bg-secondary/30 rounded-lg p-3">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1">
              <Type className="w-3 h-3" /> Estilo do texto
            </summary>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={task.style.size} onChange={e => props.onUpdateStyle({ size: e.target.value as TaskTextStyle["size"] })} className="bg-secondary rounded-md px-2 py-1 text-xs outline-none">
                <option value="sm">Pequeno</option>
                <option value="base">Normal</option>
                <option value="lg">Grande</option>
                <option value="xl">Extra grande</option>
              </select>
              <select value={task.style.weight} onChange={e => props.onUpdateStyle({ weight: e.target.value as TaskTextStyle["weight"] })} className="bg-secondary rounded-md px-2 py-1 text-xs outline-none">
                <option value="light">Leve</option>
                <option value="normal">Normal</option>
                <option value="medium">Médio</option>
                <option value="semibold">Seminegrito</option>
                <option value="bold">Negrito</option>
              </select>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paintbrush className="w-3 h-3" />
                <input type="color" value={task.style.color} onChange={e => props.onUpdateStyle({ color: e.target.value })} className="w-6 h-6 rounded border border-border cursor-pointer" />
              </div>
            </div>
          </details>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Comentários ({task.comments.length})
            </label>
            <div className="space-y-2">
              {task.comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 bg-secondary/40 rounded-md px-3 py-2">
                  <p className="flex-1 text-xs">{c.text}</p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <button onClick={() => props.onDeleteComment(c.id)} className="text-destructive hover:text-destructive/80">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddComment()}
                  placeholder="Adicionar comentário..."
                  className="flex-1 bg-secondary/40 rounded-md px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40"
                />
                <button onClick={handleAddComment} className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Delete */}
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              onClick={() => { props.onDelete(); onOpenChange(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir tarefa
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
