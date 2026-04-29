import { XpState, XpEntry, XpReason } from "@/lib/types";
import { SKINS, SkinDef, SkinStage, SkinId, isSkinUnlocked, getActiveStage } from "@/lib/godzillaSkins";
import { Trophy, Lock, Check, Flame, Calendar } from "lucide-react";

interface Props {
  state: XpState;
  progress: { level: number; intoLevel: number; needed: number; progress: number };
  streakMult: number;
  activeSkin: SkinDef;
  activeStage: SkinStage;
  setSelectedSkin: (id: SkinId) => void;
}

const REASON_LABEL: Record<XpReason, string> = {
  task_done: "Tarefa concluída",
  subtask_done: "Subtarefa",
  early_completion: "Antecipação",
  late_completion: "Atrasada",
  monthly_contribution: "Aporte do mês",
  contribution_amount: "Bônus por valor",
  daily_bonus: "Bônus diário",
  streak_bonus: "Bônus de streak",
};

export function LevelPanel({ state, progress, streakMult, activeSkin, activeStage, setSelectedSkin }: Props) {
  const recent = [...state.history].reverse().slice(0, 12);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayXp = state.dailyXp[todayKey] || 0;
  const todayDone = state.dailyDoneCount[todayKey] || 0;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-3">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nível</p>
            <p className="text-3xl font-extrabold leading-none">{progress.level}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-sm font-semibold tabular-nums">{state.totalXp} XP</p>
          </div>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums mt-1">
          <span>{progress.intoLevel} XP</span>
          <span>{progress.needed} pro Nv {progress.level + 1}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Estágio atual</span>
          <span className="font-medium truncate ml-2">{activeStage.name}</span>
        </div>
      </div>

      {/* Stats do dia */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Calendar} label="Hoje" value={`${todayXp} XP`} />
        <StatCard icon={Check} label="Tarefas" value={`${todayDone}`} />
        <StatCard icon={Flame} label="Streak" value={`${state.streakDays}d${streakMult > 1 ? ` ×${streakMult.toFixed(1)}` : ""}`} />
      </div>

      {/* Skins */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> Skins
        </h4>
        <div className="space-y-2">
          {SKINS.map(skin => {
            const unlocked = isSkinUnlocked(skin, progress.level);
            const isActive = skin.id === activeSkin.id;
            const stage = getActiveStage(skin, progress.level);
            return (
              <button
                key={skin.id}
                onClick={() => unlocked && setSelectedSkin(skin.id)}
                disabled={!unlocked}
                className={`w-full text-left p-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  isActive ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                } ${!unlocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="w-10 h-10 rounded bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {skin.previewSprite ? (
                    <img src={skin.previewSprite} alt="" className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                  ) : (
                    <span className="text-lg">🦖</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{skin.name}</span>
                    {!unlocked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {isActive && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {unlocked ? `Estágio: ${stage.name}` : `Desbloqueia no Nv ${skin.unlockLevel}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Próximos estágios da skin ativa */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Estágios — {activeSkin.name}
        </h4>
        <div className="space-y-1">
          {activeSkin.stages.map(s => {
            const reached = progress.level >= s.unlockLevel;
            const isCurrent = s.name === activeStage.name;
            return (
              <div
                key={s.name}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                  isCurrent ? "bg-primary/10 border border-primary/30" : reached ? "" : "opacity-50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {reached ? <Check className="w-3 h-3 text-primary" /> : <Lock className="w-3 h-3" />}
                  <span className={isCurrent ? "font-semibold" : ""}>{s.name}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">Nv {s.unlockLevel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico */}
      {recent.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Últimos ganhos
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
            {recent.map(e => (
              <HistoryRow key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold tabular-nums">{value}</p>
    </div>
  );
}

function HistoryRow({ entry }: { entry: XpEntry }) {
  const sign = entry.amount >= 0 ? "+" : "";
  const colorClass = entry.amount >= 0 ? "text-success" : "text-destructive";
  return (
    <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded hover:bg-accent/30">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{REASON_LABEL[entry.reason]}</p>
        {entry.detail && <p className="text-[10px] text-muted-foreground truncate">{entry.detail}</p>}
      </div>
      <span className={`font-bold tabular-nums ml-2 ${colorClass}`}>{sign}{entry.amount}</span>
    </div>
  );
}
