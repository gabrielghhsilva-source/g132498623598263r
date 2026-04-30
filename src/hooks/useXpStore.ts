import { useState, useCallback, useEffect, useRef } from "react";
import { XpState, DEFAULT_XP_STATE } from "@/lib/types";
import {
  applyTaskCompletion, applySubtaskCompletion, applyContribution,
  TaskAwardContext, progressFromXp, streakMultiplier,
} from "@/lib/xpEngine";
import { SKINS, SkinId, getActiveStage, getSkin, isSkinUnlocked } from "@/lib/godzillaSkins";
import { secureGet, secureSet } from "@/lib/crypto";
import { toast } from "sonner";

const STORAGE_KEY = "xp-state";

function loadXp(): XpState {
  try {
    const raw = secureGet(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_XP_STATE };
    const parsed = JSON.parse(raw) as Partial<XpState>;
    return {
      ...DEFAULT_XP_STATE,
      ...parsed,
      // sanity
      unlockedSkins: parsed.unlockedSkins?.length ? parsed.unlockedSkins : ["classic"],
      selectedSkin: parsed.selectedSkin || "classic",
    };
  } catch {
    return { ...DEFAULT_XP_STATE };
  }
}

export function useXpStore() {
  const [state, setState] = useState<XpState>(() => loadXp());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist
  useEffect(() => {
    try { secureSet(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  // Auto-unlock skins when level rises
  useEffect(() => {
    const newlyUnlocked = SKINS.filter(s =>
      isSkinUnlocked(s, state.currentLevel) && !state.unlockedSkins.includes(s.id),
    );
    if (newlyUnlocked.length > 0) {
      setState(prev => ({
        ...prev,
        unlockedSkins: Array.from(new Set([...prev.unlockedSkins, ...newlyUnlocked.map(s => s.id)])),
      }));
      newlyUnlocked.forEach(s => {
        toast.success(`🎉 Skin desbloqueada: ${s.name}!`, { duration: 5000 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentLevel]);

  const handleResult = useCallback((res: ReturnType<typeof applyTaskCompletion>) => {
    setState(res.state);
    if (res.leveledUp) {
      const skin = getSkin(stateRef.current.selectedSkin as SkinId);
      const stage = getActiveStage(skin, res.newLevel);
      toast.success(`⬆️ Nível ${res.newLevel}!`, {
        description: `Estágio atual: ${stage.name}`,
        duration: 4500,
      });
    } else {
      const totalAwarded = res.entries.reduce((a, e) => a + e.amount, 0);
      if (totalAwarded > 0) {
        toast.success(`+${totalAwarded} XP`, { duration: 1800 });
      }
    }
  }, []);

  const awardTask = useCallback((ctx: TaskAwardContext) => {
    const res = applyTaskCompletion(stateRef.current, ctx);
    handleResult(res);
  }, [handleResult]);

  const awardSubtask = useCallback((taskText: string) => {
    const res = applySubtaskCompletion(stateRef.current, taskText);
    handleResult(res);
  }, [handleResult]);

  const awardContribution = useCallback((investmentId: string, amount: number) => {
    const res = applyContribution(stateRef.current, investmentId, amount);
    handleResult(res);
  }, [handleResult]);

  /** DEV: concede XP bruto direto, útil pra testar evolução de skins/níveis. */
  const devAddXp = useCallback((amount: number) => {
    const entry = {
      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      ts: new Date().toISOString(),
      amount,
      base: amount,
      multiplier: 1,
      reason: "task_done" as const,
      detail: "DEV +XP",
    };
    setState(prev => {
      const oldLevel = prev.currentLevel;
      const totalXp = Math.max(0, prev.totalXp + amount);
      const today = entry.ts.slice(0, 10);
      const dailyXp = { ...prev.dailyXp, [today]: (prev.dailyXp[today] || 0) + amount };
      const history = [...prev.history, entry].slice(-200);
      const next = {
        ...prev,
        totalXp,
        currentLevel: Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / 100)) / 2)),
        history,
        dailyXp,
      };
      if (next.currentLevel > oldLevel) {
        const skin = getSkin(next.selectedSkin as SkinId);
        const stage = getActiveStage(skin, next.currentLevel);
        toast.success(`⬆️ Nível ${next.currentLevel}!`, { description: `Estágio: ${stage.name}`, duration: 3500 });
      } else {
        toast.success(`+${amount} XP (dev)`, { duration: 1500 });
      }
      return next;
    });
  }, []);

  /** DEV: zera tudo de XP/níveis. */
  const devResetXp = useCallback(() => {
    setState({ ...DEFAULT_XP_STATE });
    toast.success("XP resetado", { duration: 1500 });
  }, []);

  const setSelectedSkin = useCallback((id: SkinId) => {
    setState(prev => {
      const skin = getSkin(id);
      if (!isSkinUnlocked(skin, prev.currentLevel)) return prev;
      return { ...prev, selectedSkin: id };
    });
  }, []);

  const progress = progressFromXp(state.totalXp);
  const skin = getSkin(state.selectedSkin as SkinId);
  const stage = getActiveStage(skin, state.currentLevel);
  const mult = streakMultiplier(state.streakDays);

  return {
    state,
    progress,
    activeSkin: skin,
    activeStage: stage,
    streakMultiplier: mult,
    awardTask, awardSubtask, awardContribution,
    setSelectedSkin,
  };
}
