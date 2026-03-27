import { NotificationSettings as NotifSettings } from "@/lib/types";
import { Bell, Volume2, Play, Type, Paintbrush } from "lucide-react";

const ADVANCE_OPTIONS = [
  { value: 90, label: "1h30" },
  { value: 60, label: "1h" },
  { value: 30, label: "30min" },
  { value: 15, label: "15min" },
  { value: 5, label: "5min" },
];

interface Props {
  settings: NotifSettings;
  onUpdate: (partial: Partial<NotifSettings>) => void;
  onToggleAdvanceTime: (minutes: number) => void;
  onTestSound: (customUrl?: string, volume?: number) => void;
}

export function NotificationSettingsPanel({ settings, onUpdate, onToggleAdvanceTime, onTestSound }: Props) {
  return (
    <div className="space-y-4">
      {/* Advance times */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-3 h-3" /> Avisar antes do prazo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ADVANCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onToggleAdvanceTime(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                settings.advanceTimes.includes(opt.value)
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <Volume2 className="w-3 h-3" /> Volume
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={e => onUpdate({ volume: parseFloat(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {Math.round(settings.volume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={settings.customSoundUrl || ""}
            onChange={e => onUpdate({ customSoundUrl: e.target.value || undefined })}
            placeholder="URL do som (opcional)"
            className="flex-1 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
          />
          <button
            onClick={() => onTestSound(settings.customSoundUrl, settings.volume)}
            className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity flex items-center gap-1"
          >
            <Play className="w-3 h-3" /> Testar
          </button>
        </div>
      </div>

      {/* Popup customization */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-3 h-3" /> Personalizar Pop-up
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={settings.popupTemplate}
            onChange={e => onUpdate({ popupTemplate: e.target.value })}
            placeholder="Texto do pop-up (use {tarefas} para inserir nomes)"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
          />
          <p className="text-[10px] text-muted-foreground">Use <code className="bg-secondary px-1 rounded">{"{tarefas}"}</code> para incluir os nomes das tarefas</p>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeTaskNames}
              onChange={e => onUpdate({ includeTaskNames: e.target.checked })}
              className="accent-primary"
            />
            Incluir nomes das tarefas automaticamente
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Paintbrush className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Borda:</span>
              <input
                type="color"
                value={settings.popupBorderColor}
                onChange={e => onUpdate({ popupBorderColor: e.target.value })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Texto:</span>
              <input
                type="color"
                value={settings.popupTextColor}
                onChange={e => onUpdate({ popupTextColor: e.target.value })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Tamanho:</span>
              <select
                value={settings.popupTextSize}
                onChange={e => onUpdate({ popupTextSize: e.target.value as NotifSettings["popupTextSize"] })}
                className="bg-secondary rounded-md px-2 py-1 text-xs border-none outline-none text-foreground"
              >
                <option value="sm">Pequeno</option>
                <option value="base">Normal</option>
                <option value="lg">Grande</option>
                <option value="xl">Extra grande</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
