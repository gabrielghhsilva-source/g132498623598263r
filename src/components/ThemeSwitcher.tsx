import { ThemeId, ThemeOption } from "@/lib/types";
import { Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const THEMES: ThemeOption[] = [
  { id: "mono-light", name: "Claro", preview: "#f7f7f7" },
  { id: "mono-dark", name: "Escuro", preview: "#1a1a1a" },
  { id: "beige", name: "Bege", preview: "#e8dcc8" },
  { id: "cyan", name: "Ciano", preview: "#0ea5c7" },
  { id: "lavender", name: "Lavanda", preview: "#8b5cf6" },
  { id: "rose", name: "Rosa", preview: "#e11d63" },
];

interface Props {
  current: ThemeId;
  onChange: (t: ThemeId) => void;
}

export function ThemeSwitcher({ current, onChange }: Props) {
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
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Tema</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 z-50 animate-scale-in min-w-[160px]">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                current === t.id ? "bg-accent font-semibold" : "hover:bg-accent/50"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                style={{ backgroundColor: t.preview }}
              />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
