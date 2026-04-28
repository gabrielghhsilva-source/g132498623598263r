import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mic, Square, Loader2, Sparkles, Trash2, Check, X } from "lucide-react";
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

type Phase = "idle" | "recording" | "processing" | "review";

export function VoiceTaskDialog({ open, onOpenChange, areas, tags, timezone, onCreateTasks }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setTranscript("");
    setTasks([]);
    setElapsed(0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Auto-start gravação quando o diálogo abre
  useEffect(() => {
    if (!open || phase !== "idle") return;
    void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const todayStr = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
      return fmt.format(new Date());
    } catch { return new Date().toISOString().slice(0, 10); }
  })();

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
        void processAudio(blob);
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      setPhase("recording");
    } catch (e) {
      console.error(e);
      toast.error("Permissão de microfone negada");
      onOpenChange(false);
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setPhase("processing");
  }

  async function processAudio(blob: Blob) {
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const pwd = getAppPassword();
      const { data, error } = await supabase.functions.invoke("voice-tasks", {
        body: {
          audio: base64,
          mimeType: blob.type || "audio/webm",
          areas: areas.map((a) => ({ id: a.id, name: a.name })),
          tags: tags.map((t) => ({ id: t.id, name: t.name })),
          today: todayStr,
        },
        headers: pwd ? { "x-app-password": pwd } : undefined,
      });

      if (error) {
        console.error("voice-tasks invoke error:", error);
        toast.error("Falha ao processar áudio");
        onOpenChange(false);
        return;
      }

      const t: string = (data as any)?.transcript ?? "";
      const list: ParsedTask[] = (data as any)?.tasks ?? [];
      setTranscript(t);
      setTasks(list);
      if (list.length === 0) {
        toast.error("Não consegui identificar tarefas. Tenta de novo?");
        onOpenChange(false);
        return;
      }
      setPhase("review");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar áudio");
      onOpenChange(false);
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
            <Sparkles className="w-4 h-4 text-primary" /> Voz inteligente
          </DialogTitle>
          <DialogDescription className="text-xs">
            Fale uma ou várias tarefas. A IA vai estruturar tudo (área, prazo, prioridade) e você revisa antes de criar.
          </DialogDescription>
        </DialogHeader>

        {phase === "recording" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-destructive flex items-center justify-center">
                <Mic className="w-8 h-8 text-destructive-foreground" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Gravando... {elapsed}s</div>
            <div className="text-xs text-muted-foreground text-center max-w-md">
              Ex: <em>"Trabalho: trocar nome da home, criar seção nova e gerar uma arte urgente pra sexta às 14h"</em>
            </div>
            <button
              onClick={stopRecording}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2 font-medium"
            >
              <Square className="w-4 h-4" /> Parar e processar
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Transcrevendo e estruturando tarefas...</div>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            {transcript && (
              <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2 italic">
                <strong className="not-italic">Você disse:</strong> "{transcript}"
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
                      title="Remover esta tarefa"
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
