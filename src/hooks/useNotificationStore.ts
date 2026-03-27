import { useState, useCallback, useEffect } from "react";
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/types";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useNotificationStore() {
  const [settings, setSettingsState] = useState<NotificationSettings>(() =>
    loadFromStorage("task-notification-settings", DEFAULT_NOTIFICATION_SETTINGS)
  );

  useEffect(() => {
    localStorage.setItem("task-notification-settings", JSON.stringify(settings));
  }, [settings]);

  const setSettings = useCallback((partial: Partial<NotificationSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }));
  }, []);

  const toggleAdvanceTime = useCallback((minutes: number) => {
    setSettingsState(prev => {
      const times = prev.advanceTimes.includes(minutes)
        ? prev.advanceTimes.filter(t => t !== minutes)
        : [...prev.advanceTimes, minutes].sort((a, b) => b - a);
      return { ...prev, advanceTimes: times };
    });
  }, []);

  const playTestSound = useCallback((customUrl?: string, volume = 0.5) => {
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = volume;
      audio.play().catch(() => {});
      return;
    }
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 830;
      osc.type = "sine";
      gain.gain.value = volume;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  return { settings, setSettings, toggleAdvanceTime, playTestSound };
}
