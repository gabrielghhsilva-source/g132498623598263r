import { useRef, useState, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAppPassword } from "@/lib/crypto";
import { toast } from "sonner";

interface Props {
  onTranscribed: (text: string) => void;
  className?: string;
  /** Title attribute para o botão (acessibilidade). */
  label?: string;
}

/**
 * Botão de microfone que grava áudio do usuário e usa o Lovable AI (Gemini)
 * via edge function `transcribe-audio` para transcrever em PT-BR.
 *
 * Estados visuais: idle (Mic) → recording (Square pulsando) → loading (spinner).
 */
export function VoiceRecorderButton({ onTranscribed, className, label = "Ditar tarefa" }: Props) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleStop = useCallback(async (blob: Blob) => {
    setLoading(true);
    try {
      // Convert Blob -> base64 (sem o prefixo data:)
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
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64, mimeType: blob.type || "audio/webm" },
        headers: pwd ? { "x-app-password": pwd } : undefined,
      });

      if (error) {
        console.error("transcribe-audio invoke error:", error);
        toast.error("Falha ao transcrever áudio");
        return;
      }

      const text: string = (data as any)?.text?.trim?.() ?? "";
      if (!text) {
        toast.error("Não consegui entender o áudio. Tenta de novo?");
        return;
      }
      onTranscribed(text);
      toast.success("Áudio transcrito!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar áudio");
    } finally {
      setLoading(false);
    }
  }, [onTranscribed]);

  const startRecording = async () => {
    if (loading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stopStream();
        handleStop(blob);
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
  };

  const onClick = () => {
    if (loading) return;
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={loading ? "Transcrevendo..." : recording ? "Parar gravação" : label}
      aria-label={loading ? "Transcrevendo" : recording ? "Parar gravação" : label}
      className={`inline-flex items-center justify-center rounded-lg transition-all ${
        recording
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-secondary hover:bg-accent text-foreground"
      } disabled:opacity-50 ${className ?? "w-9 h-9"}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : recording ? (
        <Square className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
