import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageIcon, Loader2, Sparkles, Trash2, Check, X, Upload, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAppPassword } from "@/lib/crypto";
import { toast } from "sonner";
import { TaskTag, TaskPriority, PRIORITY_META } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";

interface AreaOption { id: string; name: string; icon: string; }

interface ParsedTask {
  title: string;
  areaId: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  tagIds: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  areas: AreaOption[];
  tags: TaskTag[];
  timezone: string;
  onCreateTasks: (items: { areaId: string; input: AddTaskInput }[]) => void;
}

type Phase = "pick" | "processing" | "review";

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.82;

// Reduz a imagem em memória antes de enviar (nada é salvo em disco/cloud).
async function fileToCompressedBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const idx = out.indexOf(",");
  return { base64: out.slice(idx + 1), mimeType: "image/jpeg", previewUrl: out };
}

export function ImageTaskDialog({ open, onOpenChange, areas, tags, timezone, onCreateTasks }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [preview, setPreview] = useState<string>("");
  const [hint, setHint] = useState("");
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase("pick");
    setPreview("");
    setHint("");
    setTasks([]);
    setDescription("");
  }, []);

  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const todayStr = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
      return fmt.format(new Date());
    } catch { return new Date().toISOString().slice(0, 10); }
  })();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    setPhase("processing");
    try {
      const { base64, mimeType, previewUrl } = await fileToCompressedBase64(file);
      setPreview(previewUrl);

      const pwd = getAppPassword();
      const { data, error } = await supabase.functions.invoke("image-tasks", {
        body: {
          image: base64,
          mimeType,
          hint: hint.trim(),
          areas: areas.map((a) => ({ id: a.id, name: a.name })),
          tags: tags.map((t) => ({ id: t.id, name: t.name })),
          today: todayStr,
        },
        headers: pwd ? { "x-app-password": pwd } : undefined,
      });

      if (error) {
        console.error("image-tasks invoke error:", error);
        toast.error("Falha ao processar imagem");
        setPhase("pick");
        return;
      }

      const list: ParsedTask[] = (data as any)?.tasks ?? [];
      const desc: string = (data as any)?.description ?? "";
      setDescription(desc);
      setTasks(list);
      if (list.length === 0) {
        toast.error("Não consegui identificar tarefas nessa imagem.");
        setPhase("pick");
        return;
      }
      setPhase("review");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar imagem");
      setPhase("pick");
    }
  }

  function updateTask(idx: number, patch: Partial<ParsedTask>) {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleConfirm() {
    const valid = tasks.filter((t) => t.title.trim() && t.areaId);
    if (valid.length === 0) { onOpenChange(false); return; }
    const items = valid.map((t) => ({
      areaId: t.areaId,
      input: {
        text: t.title.trim(),
        dueDate: t.dueDate || undefined,
        dueTime: t.dueTime || undefined,
        priority: t.priority,
        tagIds: t.tagIds,
        subtasks: [],
      } as AddTaskInput,
    }));
    onCreateTasks(items);
    toast.success(`${valid.length} tarefa${valid.length === 1 ? "" : "s"} criada${valid.length === 1 ? "" : "s"}!`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Imagem → Tarefas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie uma foto (lista escrita, print de chat, screenshot, post-it…) e a IA extrai as tarefas. A imagem não é salva — é descartada após a leitura.
          </DialogDescription>
        </DialogHeader>

        {phase === "pick" && (
          <div className="space-y-4 py-2">
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Contexto opcional (ex: 'tudo na área Trabalho')"
              className="w-full bg-secondary/40 rounded-md px-3 py-2 text-sm outline-none border border-border focus:border-primary/40"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/30 transition-colors"
              >
                <Upload className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Enviar arquivo</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP…</span>
              </button>
              <button
                onClick={() => camRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/30 transition-colors"
              >
                <Camera className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Tirar foto</span>
                <span className="text-[10px] text-muted-foreground">câmera do dispositivo</span>
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />

            <p className="text-[11px] text-muted-foreground text-center">
              🔒 A imagem é redimensionada localmente e enviada apenas para a IA processar — nada fica armazenado.
            </p>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            {preview && <img src={preview} alt="Preview" className="max-h-48 rounded-lg opacity-60" />}
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Lendo imagem e extraindo tarefas…</div>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            {preview && (
              <div className="flex gap-3 items-start">
                <img src={preview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-border flex-shrink-0" />
                {description && (
                  <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2 italic flex-1">
                    <strong className="not-italic">IA viu:</strong> {description}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {tasks.map((t, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-card/40">
                  <div className="flex items-start gap-2">
                    <input
                      value={t.title}
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="flex-1 bg-secondary/40 rounded-md px-2 py-1.5 text-sm outline-none border border-border focus:border-primary/40"
                      placeholder="Título da tarefa"
                    />
                    <button
                      onClick={() => removeTask(idx)}
                      className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={t.areaId}
                      onChange={(e) => updateTask(idx, { areaId: e.target.value })}
                      className="bg-secondary/40 rounded-md px-2 py-1 text-xs outline-none border border-border"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={t.dueDate}
                      onChange={(e) => updateTask(idx, { dueDate: e.target.value })}
                      className="bg-secondary/40 rounded-md px-2 py-1 text-xs outline-none border border-border"
                    />
                    <input
                      type="time"
                      value={t.dueTime}
                      onChange={(e) => updateTask(idx, { dueTime: e.target.value })}
                      className="bg-secondary/40 rounded-md px-2 py-1 text-xs outline-none border border-border"
                    />
                    <select
                      value={t.priority}
                      onChange={(e) => updateTask(idx, { priority: e.target.value as TaskPriority })}
                      className="bg-secondary/40 rounded-md px-2 py-1 text-xs outline-none border border-border"
                    >
                      {(["none", "low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                        <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                      ))}
                    </select>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => {
                        const active = t.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => updateTask(idx, {
                              tagIds: active ? t.tagIds.filter((id) => id !== tag.id) : [...t.tagIds, tag.id],
                            })}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border transition-opacity"
                            style={{
                              backgroundColor: active ? tag.color : "transparent",
                              color: active ? "#fff" : tag.color,
                              borderColor: tag.color,
                              opacity: active ? 1 : 0.6,
                            }}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => onOpenChange(false)}
                className="px-3 py-2 text-xs rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              >
                <X className="w-3 h-3 inline mr-1" /> Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={tasks.length === 0}
                className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 font-medium inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Criar {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
