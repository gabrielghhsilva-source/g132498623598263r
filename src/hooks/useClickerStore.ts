import { useState, useCallback, useEffect, useRef } from "react";

/* ── Types ── */

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costScale: number; // multiplicador por nível
  level: number;
  maxLevel: number;
  effect: "flat" | "multiply" | "unlock";
  value: number; // flat: +N/s, multiply: xN, unlock: id do upgrade desbloqueado
  unlockId?: string; // upgrade que este desbloqueia
  unlocked: boolean;
  icon: string;
}

export interface LoopData {
  totalLoops: number;
  fragments: number;
  bonusMultiplier: number; // 1 + 0.1 * fragments
}

export interface GameState {
  energy: number;
  totalEnergy: number; // acumulado lifetime (resetado por loop)
  allTimeEnergy: number; // acumulado geral (nunca reseta)
  perSecond: number;
  upgrades: Upgrade[];
  loop: LoopData;
}

/* ── Default upgrades (árvore simples) ── */

const DEFAULT_UPGRADES: Upgrade[] = [
  // Tier 1 — sempre desbloqueados
  { id: "gen1",    name: "Gerador I",       description: "+1 energia/s",         baseCost: 10,     costScale: 1.15, level: 0, maxLevel: 50,  effect: "flat",     value: 1,   unlockId: "gen2",    unlocked: true,  icon: "⚡" },
  { id: "amp1",    name: "Amplificador I",   description: "x1.5 produção",        baseCost: 75,     costScale: 1.3,  level: 0, maxLevel: 10,  effect: "multiply", value: 1.5, unlockId: "amp2",    unlocked: true,  icon: "🔋" },
  // Tier 2
  { id: "gen2",    name: "Gerador II",       description: "+5 energia/s",         baseCost: 200,    costScale: 1.18, level: 0, maxLevel: 50,  effect: "flat",     value: 5,   unlockId: "gen3",    unlocked: false, icon: "⚙️" },
  { id: "amp2",    name: "Amplificador II",  description: "x2 produção",          baseCost: 1000,   costScale: 1.35, level: 0, maxLevel: 10,  effect: "multiply", value: 2,   unlockId: "amp3",    unlocked: false, icon: "🔌" },
  // Tier 3
  { id: "gen3",    name: "Gerador III",      description: "+25 energia/s",        baseCost: 5000,   costScale: 1.2,  level: 0, maxLevel: 50,  effect: "flat",     value: 25,  unlockId: "gen4",    unlocked: false, icon: "🔬" },
  { id: "amp3",    name: "Amplificador III", description: "x3 produção",          baseCost: 25000,  costScale: 1.4,  level: 0, maxLevel: 5,   effect: "multiply", value: 3,                        unlocked: false, icon: "🧪" },
  // Tier 4
  { id: "gen4",    name: "Gerador IV",       description: "+100 energia/s",       baseCost: 100000, costScale: 1.22, level: 0, maxLevel: 50,  effect: "flat",     value: 100, unlockId: "gen5",    unlocked: false, icon: "🌀" },
  // Tier 5
  { id: "gen5",    name: "Gerador V",        description: "+500 energia/s",       baseCost: 1e6,    costScale: 1.25, level: 0, maxLevel: 50,  effect: "flat",     value: 500,                      unlocked: false, icon: "💎" },
];

const DEFAULT_STATE: GameState = {
  energy: 0,
  totalEnergy: 0,
  allTimeEnergy: 0,
  perSecond: 0,
  upgrades: DEFAULT_UPGRADES,
  loop: { totalLoops: 0, fragments: 0, bonusMultiplier: 1 },
};

/* ── Helpers ── */

function getUpgradeCost(u: Upgrade): number {
  return Math.floor(u.baseCost * Math.pow(u.costScale, u.level));
}

function recalcPerSecond(upgrades: Upgrade[], loop: LoopData): number {
  let flat = 0;
  let mult = 1;
  for (const u of upgrades) {
    if (u.effect === "flat") flat += u.value * u.level;
    if (u.effect === "multiply" && u.level > 0) mult *= Math.pow(u.value, u.level);
  }
  return Math.floor(flat * mult * loop.bonusMultiplier);
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem("loop-game-save");
    if (raw) {
      const parsed = JSON.parse(raw);
      // merge com defaults para upgrades novos
      const upgrades = DEFAULT_UPGRADES.map(def => {
        const saved = parsed.upgrades?.find((u: Upgrade) => u.id === def.id);
        return saved ? { ...def, level: saved.level, unlocked: saved.unlocked } : def;
      });
      const loop = parsed.loop ?? DEFAULT_STATE.loop;
      const perSecond = recalcPerSecond(upgrades, loop);
      return {
        energy: parsed.energy ?? 0,
        totalEnergy: parsed.totalEnergy ?? 0,
        allTimeEnergy: parsed.allTimeEnergy ?? 0,
        perSecond,
        upgrades,
        loop,
      };
    }
  } catch {}
  return { ...DEFAULT_STATE, upgrades: DEFAULT_UPGRADES.map(u => ({ ...u })) };
}

function getFragmentGain(totalEnergy: number): number {
  return Math.floor(Math.sqrt(totalEnergy / 10000));
}

/* ── Hook ── */

export function useClickerStore() {
  const [state, setState] = useState<GameState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem("loop-game-save", JSON.stringify(state));
  }, [state]);

  // Tick de produção (100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.perSecond <= 0) return prev;
        const gain = prev.perSecond / 10;
        return {
          ...prev,
          energy: prev.energy + gain,
          totalEnergy: prev.totalEnergy + gain,
          allTimeEnergy: prev.allTimeEnergy + gain,
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const buyUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = prev.upgrades.find(u => u.id === upgradeId);
      if (!upgrade || !upgrade.unlocked) return prev;
      if (upgrade.level >= upgrade.maxLevel) return prev;
      const cost = getUpgradeCost(upgrade);
      if (prev.energy < cost) return prev;

      const newUpgrades = prev.upgrades.map(u => {
        if (u.id === upgradeId) return { ...u, level: u.level + 1 };
        // Desbloquear próximo upgrade quando o anterior chega no nível 1
        if (upgrade.unlockId && u.id === upgrade.unlockId && upgrade.level === 0) {
          return { ...u, unlocked: true };
        }
        return u;
      });

      const perSecond = recalcPerSecond(newUpgrades, prev.loop);
      return {
        ...prev,
        energy: prev.energy - cost,
        upgrades: newUpgrades,
        perSecond,
      };
    });
  }, []);

  const doLoop = useCallback(() => {
    const gain = getFragmentGain(stateRef.current.totalEnergy);
    if (gain <= 0) return;
    setState(prev => {
      const newFragments = prev.loop.fragments + gain;
      const newLoop: LoopData = {
        totalLoops: prev.loop.totalLoops + 1,
        fragments: newFragments,
        bonusMultiplier: 1 + 0.1 * newFragments,
      };
      const resetUpgrades = prev.upgrades.map(u => ({
        ...u,
        level: 0,
        // Tier 1 sempre desbloqueado, resto bloqueia
        unlocked: u.id === "gen1" || u.id === "amp1",
      }));
      return {
        energy: 0,
        totalEnergy: 0,
        allTimeEnergy: prev.allTimeEnergy,
        perSecond: 0,
        upgrades: resetUpgrades,
        loop: newLoop,
      };
    });
  }, []);

  return {
    state,
    buyUpgrade,
    getUpgradeCost: (u: Upgrade) => getUpgradeCost(u),
    getFragmentGain: () => getFragmentGain(stateRef.current.totalEnergy),
    doLoop,
  };
}
