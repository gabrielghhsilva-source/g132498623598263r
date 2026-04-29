import { Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  level: number;
  progress: number; // 0..1
  intoLevel: number;
  needed: number;
  stageName: string;
  skinName: string;
  streakDays: number;
  streakMultiplier: number;
}

export function LevelBadge({ level, progress, intoLevel, needed, stageName, skinName, streakDays, streakMultiplier }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
        aria-label={`Nível ${level}`}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-bold tracking-tight">Nv {level}</span>
        <div className="hidden sm:flex flex-col items-start gap-0.5 min-w-[60px]">
          <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="text-[9px] leading-none text-muted-foreground tabular-nums">
            {intoLevel}/{needed} XP
          </span>
        </div>
      </button>

      {hover && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-64 animate-fade-in pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Nível atual</span>
            <span className="text-2xl font-extrabold leading-none">{level}</span>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{intoLevel} XP</span>
              <span>{needed} pro Nv {level + 1}</span>
            </div>
          </div>

          <div className="border-t border-border pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Skin</span>
              <span className="font-medium truncate ml-2">{skinName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Estágio</span>
              <span className="font-medium truncate ml-2">{stageName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Streak</span>
              <span className="font-medium">
                {streakDays}d {streakMultiplier > 1 && <span className="text-primary">×{streakMultiplier.toFixed(1)}</span>}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
