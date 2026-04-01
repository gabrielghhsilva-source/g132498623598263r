import { useClickerStore, ClickerUpgrade } from "@/hooks/useClickerStore";
import { useState } from "react";
import { Zap, RotateCcw, MousePointerClick } from "lucide-react";

function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toLocaleString("pt-BR");
  if (n < 1e6) return (n / 1e3).toFixed(1) + "K";
  if (n < 1e9) return (n / 1e6).toFixed(2) + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2) + "B";
  return (n / 1e12).toFixed(2) + "T";
}

export function ClickerGame() {
  const { state, click, buyUpgrade, getUpgradeCost, getPrestigeGain, prestige } = useClickerStore();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const prestigeGain = getPrestigeGain();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    click();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  };

  const clickUpgrades = state.upgrades.filter(u => u.type === "click");
  const autoUpgrades = state.upgrades.filter(u => u.type === "auto");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pontos" value={formatNumber(state.points)} />
        <StatCard label="Por clique" value={`+${formatNumber(state.clickPower)}`} />
        <StatCard label="Por segundo" value={`+${formatNumber(state.autoPerSecond)}/s`} />
      </div>

      {/* Main clicker */}
      <div className="flex justify-center">
        <button
          onClick={handleClick}
          className="relative w-36 h-36 rounded-full border-4 border-primary/30 bg-card shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center group overflow-hidden"
        >
          <MousePointerClick className="w-12 h-12 text-primary group-hover:text-primary/80 transition-colors" />
          {ripples.map(r => (
            <span
              key={r.id}
              className="absolute rounded-full bg-primary/20 animate-ping pointer-events-none"
              style={{ left: r.x - 10, top: r.y - 10, width: 20, height: 20 }}
            />
          ))}
          <span className="absolute -bottom-0 text-xs text-muted-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            +{formatNumber(state.clickPower)}
          </span>
        </button>
      </div>

      {/* Prestige */}
      {(state.totalPoints >= 100000 || state.prestige.totalPrestiges > 0) && (
        <div className="bg-card border border-border rounded-xl p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>Prestígio (x{state.prestige.multiplier.toFixed(1)} bônus)</span>
          </div>
          {state.prestige.totalPrestiges > 0 && (
            <p className="text-xs text-muted-foreground">
              Prestígios: {state.prestige.totalPrestiges} · Pontos: {state.prestige.prestigePoints}
            </p>
          )}
          <button
            onClick={prestige}
            disabled={prestigeGain <= 0}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {prestigeGain > 0
              ? `Resetar por +${prestigeGain} ponto${prestigeGain > 1 ? "s" : ""} de prestígio`
              : "Precisa de mais pontos totais"}
          </button>
        </div>
      )}

      {/* Upgrades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Clique
          </h3>
          {clickUpgrades.map(u => (
            <UpgradeCard key={u.id} upgrade={u} points={state.points} cost={getUpgradeCost(u)} onBuy={() => buyUpgrade(u.id)} />
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Automático
          </h3>
          {autoUpgrades.map(u => (
            <UpgradeCard key={u.id} upgrade={u} points={state.points} cost={getUpgradeCost(u)} onBuy={() => buyUpgrade(u.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function UpgradeCard({ upgrade, points, cost, onBuy }: { upgrade: ClickerUpgrade; points: number; cost: number; onBuy: () => void }) {
  const canAfford = points >= cost;
  return (
    <button
      onClick={onBuy}
      disabled={!canAfford}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        canAfford
          ? "bg-card border-border hover:border-primary/50 hover:shadow-sm cursor-pointer"
          : "bg-muted/30 border-border/50 opacity-60 cursor-not-allowed"
      }`}
    >
      <span className="text-xl">{upgrade.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{upgrade.name}</span>
          <span className="text-xs text-muted-foreground">Lv.{upgrade.level}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{upgrade.description}</p>
      </div>
      <span className={`text-xs font-bold whitespace-nowrap ${canAfford ? "text-primary" : "text-muted-foreground"}`}>
        {formatNumber(cost)}
      </span>
    </button>
  );
}
