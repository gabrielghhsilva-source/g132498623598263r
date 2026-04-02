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
  effect: "flat" | "multiply" | "unlock" | "synergy" | "tempo" | "compound" | "echo" | "fragscale";
  value: number;
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
  // ── Tier 1 — sempre desbloqueados ──
  { id: "gen1",    name: "Gerador I",        description: "+1 energia/s",                          baseCost: 15,      costScale: 1.12, level: 0, maxLevel: 50,  effect: "flat",     value: 1,    unlockId: "gen2",    unlocked: true,  icon: "⚡" },
  { id: "amp1",    name: "Amplificador I",   description: "x1.3 produção",                         baseCost: 50,      costScale: 1.28, level: 0, maxLevel: 10,  effect: "multiply", value: 1.3,  unlockId: "syn1",    unlocked: true,  icon: "🔋" },
  // ── Tier 2 ──
  { id: "gen2",    name: "Gerador II",       description: "+4 energia/s",                          baseCost: 120,     costScale: 1.14, level: 0, maxLevel: 50,  effect: "flat",     value: 4,    unlockId: "gen3",    unlocked: false, icon: "⚙️" },
  { id: "syn1",    name: "Sinergia",         description: "+0.5/s por nível de Gerador I",         baseCost: 200,     costScale: 1.25, level: 0, maxLevel: 15,  effect: "synergy",  value: 0.5,  unlockId: "amp2",    unlocked: false, icon: "🔗" },
  // ── Tier 3 ──
  { id: "gen3",    name: "Gerador III",      description: "+15 energia/s",                         baseCost: 800,     costScale: 1.16, level: 0, maxLevel: 50,  effect: "flat",     value: 15,   unlockId: "tempo1",  unlocked: false, icon: "🔬" },
  { id: "amp2",    name: "Amplificador II",  description: "x1.5 produção",                         baseCost: 1500,    costScale: 1.32, level: 0, maxLevel: 8,   effect: "multiply", value: 1.5,  unlockId: "comp1",   unlocked: false, icon: "🔌" },
  // ── Tier 4 — mecânicas especiais ──
  { id: "tempo1",  name: "Acelerador",       description: "+2/s por minuto neste loop (max 30min)", baseCost: 3000,    costScale: 1.35, level: 0, maxLevel: 5,   effect: "tempo",    value: 2,    unlockId: "gen4",    unlocked: false, icon: "⏱️" },
  { id: "comp1",   name: "Juros Compostos",  description: "energia^0.03 adicionado ao /s",         baseCost: 5000,    costScale: 1.4,  level: 0, maxLevel: 5,   effect: "compound", value: 0.03, unlockId: "amp3",    unlocked: false, icon: "📈" },
  // ── Tier 5 ──
  { id: "gen4",    name: "Gerador IV",       description: "+60 energia/s",                         baseCost: 12000,   costScale: 1.18, level: 0, maxLevel: 50,  effect: "flat",     value: 60,   unlockId: "gen5",    unlocked: false, icon: "🌀" },
  { id: "amp3",    name: "Amplificador III", description: "x2 produção",                           baseCost: 30000,   costScale: 1.45, level: 0, maxLevel: 5,   effect: "multiply", value: 2,    unlockId: "echo1",   unlocked: false, icon: "🧪" },
  // ── Tier 6 — late game ──
  { id: "gen5",    name: "Gerador V",        description: "+250 energia/s",                        baseCost: 100000,  costScale: 1.2,  level: 0, maxLevel: 50,  effect: "flat",     value: 250,  unlockId: "gen6",    unlocked: false, icon: "💎" },
  { id: "echo1",   name: "Eco de Loop",      description: "+5/s por loop completado",              baseCost: 150000,  costScale: 1.5,  level: 0, maxLevel: 5,   effect: "echo",     value: 5,    unlockId: "frag1",   unlocked: false, icon: "🔁" },
  // ── Tier 7 ──
  { id: "gen6",    name: "Gerador VI",       description: "+1000 energia/s",                       baseCost: 500000,  costScale: 1.22, level: 0, maxLevel: 50,  effect: "flat",     value: 1000,                      unlocked: false, icon: "🌟" },
  { id: "frag1",   name: "Ressonância",      description: "+20/s por fragmento",                   baseCost: 1e6,     costScale: 1.55, level: 0, maxLevel: 3,   effect: "fragscale",value: 20,                        unlocked: false, icon: "✨" },
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

function recalcPerSecond(upgrades: Upgrade[], loop: LoopData, energy: number = 0): number {
  let flat = 1; // começa com 1/s base
  let mult = 1;
  const gen1Level = upgrades.find(u => u.id === "gen1")?.level ?? 0;
  for (const u of upgrades) {
    if (u.effect === "flat") flat += u.value * u.level;
    if (u.effect === "multiply" && u.level > 0) mult *= Math.pow(u.value, u.level);
    if (u.effect === "synergy" && u.level > 0) flat += u.value * u.level * gen1Level;
    if (u.effect === "echo" && u.level > 0) flat += u.value * u.level * loop.totalLoops;
    if (u.effect === "fragscale" && u.level > 0) flat += u.value * u.level * loop.fragments;
    if (u.effect === "compound" && u.level > 0 && energy > 0) {
      flat += Math.pow(energy, u.value * u.level);
    }
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
      const perSecond = recalcPerSecond(upgrades, loop, parsed.energy ?? 0);
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
  const freshState = { ...DEFAULT_STATE, upgrades: DEFAULT_UPGRADES.map(u => ({ ...u })) };
  freshState.perSecond = 1; // 1/s base
  return freshState;
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
