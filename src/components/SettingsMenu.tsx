import { Settings, ChevronRight, Palette, Clock, ImageIcon, Bell, Paintbrush, Sparkles, Calendar, Layers } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";
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
  buttonBgColor: string;
  buttonTextColor: string;
  onButtonBgChange: (c: string) => void;
  onButtonTextChange: (c: string) => void;
  showThemeDecorations: boolean;
  onShowThemeDecorationsChange: (v: boolean) => void;
  glassMode: boolean;
  onGlassModeChange: (v: boolean) => void;
  googleCalendarSlot?: ReactNode;
}

type MenuPath = null | "root" | "themes" | "themes-colors" | "themes-bg" | "time" | "time-tz" | "time-notif" | "buttons" | "gcal";

export function SettingsMenu({
  theme, onThemeChange, customColors, onCustomColorsChange,
  timezone, onTimezoneChange,
  notificationSettings, onNotificationUpdate, onToggleAdvanceTime, onTestSound,
  backgroundSettings, onBackgroundUpdate,
  buttonBgColor, buttonTextColor, onButtonBgChange, onButtonTextChange,
  showThemeDecorations, onShowThemeDecorationsChange,
  glassMode, onGlassModeChange,
  googleCalendarSlot,
}: Props) {
  const [path, setPath] = useState<MenuPath>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPath(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleRoot = () => setPath(path === null ? "root" : null);

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={toggleRoot}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium ${path ? "bg-accent" : ""}`}
        style={buttonBgColor !== "#000000" || buttonTextColor !== "#ffffff" ? { backgroundColor: buttonBgColor, color: buttonTextColor, borderColor: buttonBgColor } : {}}
        aria-label="Configurações"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Configurações</span>
      </button>

      {path && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 animate-scale-in w-[calc(100vw-1.5rem)] sm:w-auto sm:min-w-[280px] max-w-[340px] max-h-[80vh] overflow-y-auto no-scrollbar">
          {path === "root" && (
            <div className="p-2 space-y-0.5">
              <MenuItem icon={Palette} label="Temas" onClick={() => setPath("themes")} hasSubmenu />
              <MenuItem icon={Clock} label="Horário" onClick={() => setPath("time")} hasSubmenu />
              <MenuItem icon={Paintbrush} label="Botões" onClick={() => setPath("buttons")} hasSubmenu />
              {googleCalendarSlot && <MenuItem icon={Calendar} label="Google Agenda" onClick={() => setPath("gcal")} hasSubmenu />}
            </div>
          )}

          {path === "gcal" && (
            <div className="p-3 space-y-3 w-[320px] max-w-[calc(100vw-1.5rem)]">
              <BackButton onClick={() => setPath("root")} label="Google Agenda" />
              {googleCalendarSlot}
            </div>
          )}

          {path === "themes" && (
            <div className="p-2 space-y-0.5">
              <BackButton onClick={() => setPath("root")} label="Temas" />
              <MenuItem icon={Palette} label="Cores" onClick={() => setPath("themes-colors")} hasSubmenu />
              <MenuItem icon={ImageIcon} label="Background" onClick={() => setPath("themes-bg")} hasSubmenu />
              <button
                onClick={() => onShowThemeDecorationsChange(!showThemeDecorations)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span>Elementos do tema</span>
                </div>
                <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${showThemeDecorations ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${showThemeDecorations ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
              </button>
            </div>
          )}
          {path === "themes-colors" && (
            <div className="p-3 space-y-3">
              <BackButton onClick={() => setPath("themes")} label="Cores" />
              <ThemeSwitcher current={theme} onChange={onThemeChange} customColors={customColors} onCustomColorsChange={onCustomColorsChange} embedded />
            </div>
          )}
          {path === "themes-bg" && (
            <div className="p-3 space-y-3">
              <BackButton onClick={() => setPath("themes")} label="Background" />
              <BackgroundSettingsPanel settings={backgroundSettings} onUpdate={onBackgroundUpdate} />
            </div>
          )}

          {path === "time" && (
            <div className="p-2 space-y-0.5">
              <BackButton onClick={() => setPath("root")} label="Horário" />
              <MenuItem icon={Clock} label="Fuso Horário" onClick={() => setPath("time-tz")} hasSubmenu />
              <MenuItem icon={Bell} label="Notificações" onClick={() => setPath("time-notif")} hasSubmenu />
            </div>
          )}
          {path === "time-tz" && (
            <div className="p-3 space-y-3">
              <BackButton onClick={() => setPath("time")} label="Fuso Horário" />
              <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
            </div>
          )}
          {path === "time-notif" && (
            <div className="p-3 space-y-3">
              <BackButton onClick={() => setPath("time")} label="Notificações" />
              <NotificationSettingsPanel settings={notificationSettings} onUpdate={onNotificationUpdate} onToggleAdvanceTime={onToggleAdvanceTime} onTestSound={onTestSound} />
            </div>
          )}

          {path === "buttons" && (
            <div className="p-3 space-y-3">
              <BackButton onClick={() => setPath("root")} label="Botões" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fundo dos botões</span>
                  <input type="color" value={buttonBgColor} onChange={e => onButtonBgChange(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Texto dos botões</span>
                  <input type="color" value={buttonTextColor} onChange={e => onButtonTextChange(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                </div>
                <div className="mt-2 p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground mb-2">Pré-visualização:</p>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}>
                    Exemplo de botão
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, hasSubmenu }: { icon: typeof Settings; label: string; onClick: () => void; hasSubmenu?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      {hasSubmenu && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-muted-foreground mb-1">
      <ChevronRight className="w-4 h-4 rotate-180" />
      <span className="font-semibold text-foreground">{label}</span>
    </button>
  );
}
