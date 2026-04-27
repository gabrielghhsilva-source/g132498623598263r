import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { NotificationSettings } from "@/lib/types";
import { NotificationTaskRef } from "@/hooks/useNotificationSystem";

interface NotificationEvent {
  id: string;
  taskNames: string[];
  taskRefs: NotificationTaskRef[];
  advanceMinutes: number;
}

interface Props {
  event: NotificationEvent | null;
  settings: NotificationSettings;
  onDismiss: () => void;
  /** Adia o prazo de TODAS as tasks do evento em `minutes` minutos. */
  onSnooze?: (refs: NotificationTaskRef[], minutes: number) => void;
}

const SIZE_MAP = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };

export function NotificationPopup({ event, settings, onDismiss, onSnooze }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      // Tempo maior para dar chance de clicar em snooze
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [event, onDismiss]);

  if (!event) return null;

  const taskList = event.taskNames.join(", ");
  const text = settings.includeTaskNames
    ? settings.popupTemplate.replace("{tarefas}", taskList)
    : settings.popupTemplate.replace(/\s*\{tarefas\}\s*/g, "");

  const timeLabel = event.advanceMinutes > 0
    ? `em ${event.advanceMinutes} minuto${event.advanceMinutes !== 1 ? "s" : ""}`
    : "agora!";

  const close = () => { setVisible(false); setTimeout(onDismiss, 300); };

  const handleSnooze = (mins: number) => {
    if (onSnooze && event.taskRefs.length > 0) {
      onSnooze(event.taskRefs, mins);
    }
    close();
  };

  const canSnooze = !!onSnooze && event.taskRefs.length > 0;

  return (
    <div
      className={`fixed top-4 right-4 z-[100] max-w-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <div
        className="rounded-xl shadow-2xl p-4 bg-card backdrop-blur-md"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: settings.popupBorderColor,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p
              className={`${SIZE_MAP[settings.popupTextSize]} font-medium leading-snug`}
              style={{ color: settings.popupTextColor }}
            >
              {text}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ⏰ {timeLabel}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1 rounded-md hover:bg-accent transition-colors flex-shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {canSnooze && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Adiar prazo
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => handleSnooze(5)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-accent transition-colors"
              >
                +5 min
              </button>
              <button
                onClick={() => handleSnooze(30)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-accent transition-colors"
              >
                +30 min
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
