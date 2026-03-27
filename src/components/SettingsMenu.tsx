import { Palette, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { TimezoneSelector } from "./TimezoneSelector";
import { NotificationSettingsPanel } from "./NotificationSettings";
import { BackgroundSettingsPanel } from "./BackgroundSettings";
import { ThemeId, CustomThemeColors, NotificationSettings, BackgroundSettings } from "@/lib/types";

interface Props {
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
  customColors: CustomThemeColors;
  onCustomColorsChange: (c: CustomThemeColors) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  notificationSettings: NotificationSettings;
  onNotificationUpdate: (partial: Partial<NotificationSettings>) => void;
  onToggleAdvanceTime: (minutes: number) => void;
  onTestSound: (customUrl?: string, volume?: number) => void;
  backgroundSettings: BackgroundSettings;
  onBackgroundUpdate: (partial: Partial<BackgroundSettings>) => void;
}

export function SettingsMenu({
  theme, onThemeChange, customColors, onCustomColorsChange,
  timezone, onTimezoneChange,
  notificationSettings, onNotificationUpdate, onToggleAdvanceTime, onTestSound,
  backgroundSettings, onBackgroundUpdate,
}: Props) {
  const [openMenu, setOpenMenu] = useState<"theme" | "time" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        onClick={() => setOpenMenu(openMenu === "theme" ? null : "theme")}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium ${openMenu === "theme" ? "bg-accent" : ""}`}
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Temas</span>
      </button>

      <button
        onClick={() => setOpenMenu(openMenu === "time" ? null : "time")}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium ${openMenu === "time" ? "bg-accent" : ""}`}
      >
        <Clock className="w-4 h-4" />
        <span className="hidden sm:inline">Horário</span>
      </button>

      {openMenu === "theme" && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 z-50 animate-scale-in min-w-[280px] max-h-[75vh] overflow-y-auto space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Tema</p>
            <ThemeSwitcher current={theme} onChange={onThemeChange} customColors={customColors} onCustomColorsChange={onCustomColorsChange} embedded />
          </div>
          <div className="border-t border-border pt-3">
            <BackgroundSettingsPanel settings={backgroundSettings} onUpdate={onBackgroundUpdate} />
          </div>
        </div>
      )}

      {openMenu === "time" && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 z-50 animate-scale-in min-w-[320px] max-h-[75vh] overflow-y-auto space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fuso Horário</p>
            <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Notificações</p>
            <NotificationSettingsPanel settings={notificationSettings} onUpdate={onNotificationUpdate} onToggleAdvanceTime={onToggleAdvanceTime} onTestSound={onTestSound} />
          </div>
        </div>
      )}
    </div>
  );
}
