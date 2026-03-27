import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { NotificationSettings } from "@/lib/types";

interface NotificationEvent {
  id: string;
  taskNames: string[];
  advanceMinutes: number;
}

interface Props {
  event: NotificationEvent | null;
  settings: NotificationSettings;
  onDismiss: () => void;
}

const SIZE_MAP = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };

export function NotificationPopup({ event, settings, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 8000);
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
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="p-1 rounded-md hover:bg-accent transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
