import { useState, useCallback, useEffect, useRef } from "react";

export interface ClickerUpgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  level: number;
  type: "click" | "auto";
  power: number; // per level
  icon: string;
}

export interface PrestigeData {
  totalPrestiges: number;
  prestigePoints: number;
  multiplier: number; // 1 + 0.1 * prestigePoints
}

export interface ClickerState {
  points: number;
  totalPoints: number;
  clickPower: number;
  autoPerSecond: number;
  upgrades: ClickerUpgrade[];
  prestige: PrestigeData;
}

const DEFAULT_UPGRADES: ClickerUpgrade[] = [
  { id: "cursor", name: "Cursor", description: "+1 por clique", baseCost: 10, costMultiplier: 1.15, level: 0, type: "click", power: 1, icon: "👆" },
  { id: "boost", name: "Impulso", description: "+5 por clique", baseCost: 100, costMultiplier: 1.18, level: 0, type: "click", power: 5, icon: "⚡" },
  { id: "surge", name: "Onda", description: "+25 por clique", baseCost: 1000, costMultiplier: 1.2, level: 0, type: "click", power: 25, icon: "🌊" },
  { id: "bot", name: "Bot", description: "+1/s automático", baseCost: 50, costMultiplier: 1.15, level: 0, type: "auto", power: 1, icon: "🤖" },
  { id: "farm", name: "Fazenda", description: "+5/s automático", baseCost: 500, costMultiplier: 1.18, level: 0, type: "auto", power: 5, icon: "🌾" },
  { id: "factory", name: "Fábrica", description: "+20/s automático", baseCost: 3000, costMultiplier: 1.2, level: 0, type: "auto", power: 20, icon: "🏭" },
  { id: "lab", name: "Laboratório", description: "+100/s automático", baseCost: 20000, costMultiplier: 1.22, level: 0, type: "auto", power: 100, icon: "🔬" },
  { id: "portal", name: "Portal", description: "+500/s automático", baseCost: 200000, costMultiplier: 1.25, level: 0, type: "auto", power: 500, icon: "🌀" },
];

const DEFAULT_STATE: ClickerState = {
  points: 0,
  totalPoints: 0,
  clickPower: 1,
  autoPerSecond: 0,
  upgrades: DEFAULT_UPGRADES,
  prestige: { totalPrestiges: 0, prestigePoints: 0, multiplier: 1 },
};

function loadState(): ClickerState {
  try {
    const stored = localStorage.getItem("clicker-save");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new upgrades
      const upgrades = DEFAULT_UPGRADES.map(def => {
        const saved = parsed.upgrades?.find((u: ClickerUpgrade) => u.id === def.id);
        return saved ? { ...def, level: saved.level } : def;
      });
      return { ...DEFAULT_STATE, ...parsed, upgrades };
    }
  } catch {}
  return DEFAULT_STATE;
}

function getUpgradeCost(upgrade: ClickerUpgrade): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

function recalcStats(upgrades: ClickerUpgrade[], prestige: PrestigeData) {
  let clickPower = 1;
  let autoPerSecond = 0;
  for (const u of upgrades) {
    if (u.type === "click") clickPower += u.power * u.level;
    else autoPerSecond += u.power * u.level;
  }
  clickPower = Math.floor(clickPower * prestige.multiplier);
  autoPerSecond = Math.floor(autoPerSecond * prestige.multiplier);
  return { clickPower, autoPerSecond };
}

export function useClickerStore() {
  const [state, setState] = useState<ClickerState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("clicker-save", JSON.stringify(state));
  }, [state]);

  // Auto-production tick
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.autoPerSecond <= 0) return prev;
        const gain = prev.autoPerSecond / 10; // 100ms tick
        return {
          ...prev,
          points: prev.points + gain,
          totalPoints: prev.totalPoints + gain,
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const click = useCallback(() => {
    setState(prev => ({
      ...prev,
      points: prev.points + prev.clickPower,
      totalPoints: prev.totalPoints + prev.clickPower,
    }));
  }, []);

  const buyUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = prev.upgrades.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      const cost = getUpgradeCost(upgrade);
      if (prev.points < cost) return prev;

      const newUpgrades = prev.upgrades.map(u =>
        u.id === upgradeId ? { ...u, level: u.level + 1 } : u
      );
      const stats = recalcStats(newUpgrades, prev.prestige);
      return {
        ...prev,
        points: prev.points - cost,
        upgrades: newUpgrades,
        ...stats,
      };
    });
  }, []);

  const getPrestigeGain = useCallback(() => {
    const tp = stateRef.current.totalPoints;
    return Math.floor(Math.sqrt(tp / 1000000));
  }, []);

  const prestige = useCallback(() => {
    const gain = getPrestigeGain();
    if (gain <= 0) return;
    setState(prev => {
      const newPP = prev.prestige.prestigePoints + gain;
      const newPrestige: PrestigeData = {
        totalPrestiges: prev.prestige.totalPrestiges + 1,
        prestigePoints: newPP,
        multiplier: 1 + 0.1 * newPP,
      };
      const resetUpgrades = prev.upgrades.map(u => ({ ...u, level: 0 }));
      const stats = recalcStats(resetUpgrades, newPrestige);
      return {
        ...DEFAULT_STATE,
        upgrades: resetUpgrades,
        prestige: newPrestige,
        ...stats,
      };
    });
  }, [getPrestigeGain]);

  return { state, click, buyUpgrade, getUpgradeCost: (u: ClickerUpgrade) => getUpgradeCost(u), getPrestigeGain, prestige };
}
