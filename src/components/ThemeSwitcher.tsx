import { ThemeId, ThemeOption, CustomThemeColors } from "@/lib/types";
import { useState } from "react";

const THEMES: ThemeOption[] = [
  { id: "mono-light", name: "Claro", preview: "#fafafa" },
  { id: "mono-dark", name: "Escuro", preview: "#0a0a0a" },
  { id: "beige", name: "Sépia", preview: "#b85a2e" },
  { id: "cyan", name: "Abissal", preview: "#0d2a33" },
  { id: "lavender", name: "Galáctico", preview: "#a855f7" },
  { id: "rose", name: "Coral", preview: "#e11d63" },
  { id: "custom", name: "Personalizado", preview: "linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1)" },
];

const COLOR_LABELS: { key: keyof CustomThemeColors; label: string }[] = [
  { key: "background", label: "Fundo" },
  { key: "foreground", label: "Texto" },
  { key: "card", label: "Caixas" },
  { key: "border", label: "Bordas" },
];

interface Props {
  current: ThemeId;
  onChange: (t: ThemeId) => void;
  customColors: CustomThemeColors;
  onCustomColorsChange: (colors: CustomThemeColors) => void;
  embedded?: boolean;
}

export function ThemeSwitcher({ current, onChange, customColors, onCustomColorsChange, embedded }: Props) {
  // If not embedded, we don't render (it's used inside SettingsMenu now)
  // But we keep the standalone mode for backward compat
  const [open, setOpen] = useState(embedded ? true : false);

  if (embedded) {
    return (
      <div className="space-y-1">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              current === t.id ? "bg-accent font-semibold" : "hover:bg-accent/50"
            }`}
          >
            {t.id === "custom" ? (
              <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" style={{ background: t.preview }} />
            ) : (
              <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: t.preview }} />
            )}
            {t.name}
          </button>
        ))}
        {current === "custom" && (
          <div className="mt-2 pt-2 border-t border-border space-y-2 px-1">
            {COLOR_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <input
                  type="color"
                  value={customColors[key]}
                  onChange={e => onCustomColorsChange({ ...customColors, [key]: e.target.value })}
                  className="w-7 h-7 rounded border border-border cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Standalone mode (unused now but kept)
  return null;
}
