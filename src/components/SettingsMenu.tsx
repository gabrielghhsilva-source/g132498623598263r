import { Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { TimezoneSelector } from "./TimezoneSelector";
import { ThemeId, CustomThemeColors } from "@/lib/types";

interface Props {
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
  customColors: CustomThemeColors;
  onCustomColorsChange: (c: CustomThemeColors) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
}

export function SettingsMenu({ theme, onThemeChange, customColors, onCustomColorsChange, timezone, onTimezoneChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Configurações</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 z-50 animate-scale-in min-w-[260px] space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Tema</p>
            <ThemeSwitcher
              current={theme}
              onChange={onThemeChange}
              customColors={customColors}
              onCustomColorsChange={onCustomColorsChange}
              embedded
            />
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fuso Horário</p>
            <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
          </div>
        </div>
      )}
    </div>
  );
}
