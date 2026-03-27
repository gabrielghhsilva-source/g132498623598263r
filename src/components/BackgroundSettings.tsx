import { BackgroundSettings, BackgroundMode } from "@/lib/types";
import { ImageIcon, Palette, Sparkles, Circle, Upload, X } from "lucide-react";
import { useRef } from "react";
import { useFileField } from "@/hooks/useFileStorage";

const MODES: { value: BackgroundMode; label: string; icon: typeof Palette }[] = [
  { value: "none", label: "Padrão", icon: Circle },
  { value: "solid", label: "Cor sólida", icon: Palette },
  { value: "gradient", label: "Gradiente", icon: Palette },
  { value: "animated-gradient", label: "Grad. animado", icon: Sparkles },
  { value: "particles", label: "Partículas", icon: Sparkles },
  { value: "image", label: "Imagem/Vídeo", icon: ImageIcon },
];

const DIRECTIONS = [
  { value: "up" as const, label: "↑ Cima" },
  { value: "down" as const, label: "↓ Baixo" },
  { value: "left" as const, label: "← Esquerda" },
  { value: "right" as const, label: "→ Direita" },
  { value: "random" as const, label: "✦ Aleatório" },
];

interface Props {
  settings: BackgroundSettings;
  onUpdate: (partial: Partial<BackgroundSettings>) => void;
}

export function BackgroundSettingsPanel({ settings, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFile = useFileField("bg-image");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await bgFile.upload(file);
    onUpdate({ imageUrl: url });
  };

  const handleRemoveFile = async () => {
    await bgFile.remove();
    onUpdate({ imageUrl: "" });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fundo</p>

      <div className="grid grid-cols-3 gap-1">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => onUpdate({ mode: m.value })}
            className={`px-2 py-1.5 text-[10px] rounded-lg border transition-colors flex items-center gap-1 ${
              settings.mode === m.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <m.icon className="w-3 h-3" />
            {m.label}
          </button>
        ))}
      </div>

      {(settings.mode === "solid" || settings.mode === "particles") && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cor base:</span>
          <input type="color" value={settings.solidColor} onChange={e => onUpdate({ solidColor: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
        </div>
      )}

      {(settings.mode === "gradient" || settings.mode === "animated-gradient") && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Cores:</span>
            {settings.gradientColors.map((c, i) => (
              <input key={i} type="color" value={c} onChange={e => { const nc = [...settings.gradientColors]; nc[i] = e.target.value; onUpdate({ gradientColors: nc }); }} className="w-7 h-7 rounded border border-border cursor-pointer" />
            ))}
            {settings.gradientColors.length < 5 && (
              <button onClick={() => onUpdate({ gradientColors: [...settings.gradientColors, "#888888"] })} className="w-7 h-7 rounded border border-dashed border-border text-muted-foreground text-xs hover:bg-accent flex items-center justify-center">+</button>
            )}
            {settings.gradientColors.length > 2 && (
              <button onClick={() => onUpdate({ gradientColors: settings.gradientColors.slice(0, -1) })} className="text-xs text-destructive hover:underline">−</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ângulo:</span>
            <input type="range" min={0} max={360} step={5} value={settings.gradientAngle} onChange={e => onUpdate({ gradientAngle: Number(e.target.value) })} className="flex-1 accent-primary" />
            <span className="text-xs text-muted-foreground w-8">{settings.gradientAngle}°</span>
          </div>
        </div>
      )}

      {settings.mode === "animated-gradient" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Velocidade:</span>
            <input type="range" min={1} max={10} step={1} value={settings.animationSpeed} onChange={e => onUpdate({ animationSpeed: Number(e.target.value) })} className="flex-1 accent-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Intensidade:</span>
            <input type="range" min={10} max={100} step={5} value={settings.animationIntensity} onChange={e => onUpdate({ animationIntensity: Number(e.target.value) })} className="flex-1 accent-primary" />
          </div>
        </div>
      )}

      {settings.mode === "particles" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cor:</span>
            <input type="color" value={settings.particleColor} onChange={e => onUpdate({ particleColor: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quantidade:</span>
            <input type="range" min={10} max={200} step={5} value={settings.particleCount} onChange={e => onUpdate({ particleCount: Number(e.target.value) })} className="flex-1 accent-primary" />
            <span className="text-xs text-muted-foreground w-6">{settings.particleCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Direção:</span>
            <div className="flex gap-1 flex-wrap">
              {DIRECTIONS.map(d => (
                <button key={d.value} onClick={() => onUpdate({ particleDirection: d.value })} className={`px-2 py-1 text-[10px] rounded border transition-colors ${settings.particleDirection === d.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{d.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {settings.mode === "image" && (
        <div className="space-y-2">
          <input type="text" value={settings.imageUrl?.startsWith("data:") ? "" : (settings.imageUrl || "")} onChange={e => onUpdate({ imageUrl: e.target.value })} placeholder="URL da imagem, GIF ou vídeo..." className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground" />
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground">
              <Upload className="w-3 h-3" /> Upload arquivo
            </button>
            {bgFile.dataUrl && (
              <button onClick={handleRemoveFile} className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                <X className="w-3 h-3" /> Remover
              </button>
            )}
          </div>
          {/* Preview */}
          {settings.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border h-20">
              {/\.(mp4|webm|ogg)/i.test(settings.imageUrl) && !settings.imageUrl.startsWith("data:") ? (
                <video src={settings.imageUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              ) : (
                <img src={settings.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Suporta .jpg, .png, .gif, .mp4, .webm ou upload local</p>
        </div>
      )}
    </div>
  );
}
