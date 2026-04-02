import { useClickerStore, Upgrade } from "@/hooks/useClickerStore";
import { useState } from "react";
import { RotateCcw, Lock, Sparkles, ChevronRight } from "lucide-react";

/* ── Formatar números grandes ── */
function fmt(n: number): string {
  if (n < 1000) return Math.floor(n).toLocaleString("pt-BR");
  if (n < 1e6) return (n / 1e3).toFixed(1) + "K";
  if (n < 1e9) return (n / 1e6).toFixed(2) + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2) + "B";
  return (n / 1e12).toFixed(2) + "T";
}

export function ClickerGame() {
  const { state, buyUpgrade, getUpgradeCost, getFragmentGain, doLoop } = useClickerStore();
  const fragmentGain = getFragmentGain();
  const [flashId, setFlashId] = useState<string | null>(null);

  const handleBuy = (id: string) => {
    buyUpgrade(id);
    setFlashId(id);
    setTimeout(() => setFlashId(null), 300);
  };

  const unlockedUpgrades = state.upgrades.filter(u => u.unlocked);
  const lockedUpgrades = state.upgrades.filter(u => !u.unlocked);

  return (
    <div className="space-y-5">
      {/* ── Header: energia + produção ── */}
      <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-1">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Energia</p>
        <p className="text-4xl font-bold tracking-tight">{fmt(state.energy)}</p>
        <p className="text-sm text-muted-foreground">
          +{fmt(state.perSecond)}/s
          {state.loop.bonusMultiplier > 1 && (
            <span className="ml-2 text-primary text-xs font-semibold">
              (x{state.loop.bonusMultiplier.toFixed(1)} bônus)
            </span>
          )}
        </p>
      </div>

      {/* ── Loop (prestige) ── */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Loop</span>
          </div>
          {state.loop.totalLoops > 0 && (
            <span className="text-xs text-muted-foreground">
              Loops: {state.loop.totalLoops} · Fragmentos: {state.loop.fragments}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Reseta todo progresso e converte energia acumulada em <strong>Fragmentos</strong>.
          Cada fragmento dá +10% de bônus global permanente.
        </p>

        <button
          onClick={doLoop}
          disabled={fragmentGain <= 0}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {fragmentGain > 0
            ? `Loop → +${fragmentGain} fragmento${fragmentGain > 1 ? "s" : ""}`
            : "Acumule mais energia para fazer loop"}
        </button>
      </div>

      {/* ── Upgrades desbloqueados ── */}
      <div className="space-y-2">
        <h3 className="text-xs tracking-widest uppercase text-muted-foreground font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Upgrades
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {unlockedUpgrades.map(u => (
            <UpgradeRow
              key={u.id}
              upgrade={u}
              cost={getUpgradeCost(u)}
              canAfford={state.energy >= getUpgradeCost(u)}
              maxed={u.level >= u.maxLevel}
              flash={flashId === u.id}
              onBuy={() => handleBuy(u.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Upgrades bloqueados (preview) ── */}
      {lockedUpgrades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs tracking-widest uppercase text-muted-foreground/50 font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Bloqueados
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {lockedUpgrades.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/20 opacity-40"
              >
                <span className="text-lg grayscale">{u.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-muted-foreground">{u.name}</span>
                  <p className="text-[11px] text-muted-foreground/60">{u.description}</p>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats rodapé ── */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Energia total (loop)</p>
          <p className="text-sm font-bold">{fmt(state.totalEnergy)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Energia total (geral)</p>
          <p className="text-sm font-bold">{fmt(state.allTimeEnergy)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Componente de upgrade ── */
function UpgradeRow({
  upgrade,
  cost,
  canAfford,
  maxed,
  flash,
  onBuy,
}: {
  upgrade: Upgrade;
  cost: number;
  canAfford: boolean;
  maxed: boolean;
  flash: boolean;
  onBuy: () => void;
}) {
  const effectLabel =
    upgrade.effect === "flat"
      ? `+${upgrade.value}/s`
      : upgrade.effect === "multiply"
      ? `x${upgrade.value}`
      : "🔓";

  return (
    <button
      onClick={onBuy}
      disabled={!canAfford || maxed}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 text-left ${
        flash
          ? "border-primary bg-primary/10 scale-[1.02]"
          : maxed
          ? "border-primary/30 bg-primary/5 opacity-70"
          : canAfford
          ? "border-border bg-card hover:border-primary/50 hover:shadow-sm"
          : "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
      }`}
    >
      <span className="text-xl">{upgrade.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{upgrade.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            {effectLabel}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{upgrade.description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">
          Lv.{upgrade.level}{upgrade.maxLevel < 999 ? `/${upgrade.maxLevel}` : ""}
        </p>
        {maxed ? (
          <p className="text-[10px] text-primary font-bold">MAX</p>
        ) : (
          <p className={`text-xs font-bold ${canAfford ? "text-primary" : "text-muted-foreground"}`}>
            {fmt(cost)}
          </p>
        )}
      </div>
      {!maxed && canAfford && <ChevronRight className="w-4 h-4 text-primary/50 shrink-0" />}
    </button>
  );
}
