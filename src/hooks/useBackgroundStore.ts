import { useState, useCallback, useEffect } from "react";
import { BackgroundSettings, DEFAULT_BACKGROUND_SETTINGS } from "@/lib/types";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useBackgroundStore() {
  const [settings, setSettingsState] = useState<BackgroundSettings>(() =>
    loadFromStorage("bg-settings", DEFAULT_BACKGROUND_SETTINGS)
  );

  useEffect(() => {
    localStorage.setItem("bg-settings", JSON.stringify(settings));
  }, [settings]);

  const setSettings = useCallback((partial: Partial<BackgroundSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }));
  }, []);

  return { settings, setSettings };
}
