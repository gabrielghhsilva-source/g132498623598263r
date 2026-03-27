import { BackgroundSettings, BackgroundMode } from "@/lib/types";
import { ImageIcon, Palette, Sparkles, Circle } from "lucide-react";

const MODES: { value: BackgroundMode; label: string; icon: typeof Palette }[] = [
  { value: "none", label: "Padrão", icon: Circle },
  { value: "solid", label: "Cor sólida", icon: Palette },
  { value: "gradient", label: "Gradiente", icon: Palette },
  { value: "animated-gradient", label: "Gradiente animado", icon: Sparkles },
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
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fundo</p>

      {/* Mode selector */}
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

      {/* Solid color */}
      {(settings.mode === "solid" || settings.mode === "particles") && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cor base:</span>
          <input
            type="color"
            value={settings.solidColor}
            onChange={e => onUpdate({ solidColor: e.target.value })}
            className="w-7 h-7 rounded border border-border cursor-pointer"
          />
        </div>
      )}

      {/* Gradient colors */}
      {(settings.mode === "gradient" || settings.mode === "animated-gradient") && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Cores:</span>
            {settings.gradientColors.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={e => {
                  const newColors = [...settings.gradientColors];
                  newColors[i] = e.target.value;
                  onUpdate({ gradientColors: newColors });
                }}
                className="w-7 h-7 rounded border border-border cursor-pointer"
              />
            ))}
            {settings.gradientColors.length < 5 && (
              <button
                onClick={() => onUpdate({ gradientColors: [...settings.gradientColors, "#888888"] })}
                className="w-7 h-7 rounded border border-dashed border-border text-muted-foreground text-xs hover:bg-accent flex items-center justify-center"
              >+</button>
            )}
            {settings.gradientColors.length > 2 && (
              <button
                onClick={() => onUpdate({ gradientColors: settings.gradientColors.slice(0, -1) })}
                className="text-xs text-destructive hover:underline"
              >−</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ângulo:</span>
            <input
              type="range" min={0} max={360} step={5}
              value={settings.gradientAngle}
              onChange={e => onUpdate({ gradientAngle: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-8">{settings.gradientAngle}°</span>
          </div>
        </div>
      )}

      {/* Animated gradient controls */}
      {settings.mode === "animated-gradient" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Velocidade:</span>
            <input
              type="range" min={1} max={10} step={1}
              value={settings.animationSpeed}
              onChange={e => onUpdate({ animationSpeed: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Intensidade:</span>
            <input
              type="range" min={10} max={100} step={5}
              value={settings.animationIntensity}
              onChange={e => onUpdate({ animationIntensity: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
          </div>
        </div>
      )}

      {/* Particles controls */}
      {settings.mode === "particles" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cor:</span>
            <input
              type="color"
              value={settings.particleColor}
              onChange={e => onUpdate({ particleColor: e.target.value })}
              className="w-7 h-7 rounded border border-border cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quantidade:</span>
            <input
              type="range" min={10} max={200} step={5}
              value={settings.particleCount}
              onChange={e => onUpdate({ particleCount: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-6">{settings.particleCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Direção:</span>
            <div className="flex gap-1 flex-wrap">
              {DIRECTIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => onUpdate({ particleDirection: d.value })}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    settings.particleDirection === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >{d.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image/video URL */}
      {settings.mode === "image" && (
        <div>
          <input
            type="text"
            value={settings.imageUrl}
            onChange={e => onUpdate({ imageUrl: e.target.value })}
            placeholder="URL da imagem, GIF ou vídeo..."
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Suporta .jpg, .png, .gif, .mp4, .webm</p>
        </div>
      )}
    </div>
  );
}
