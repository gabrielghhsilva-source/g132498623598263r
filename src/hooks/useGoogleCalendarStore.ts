import { useState, useCallback, useEffect, useMemo } from "react";

export interface GoogleCalendarSettings {
  clientId: string;
  enabled: boolean;
  paused: boolean;
  selectedCalendarIds: string[]; // [] = ["primary"]
  syncDirection: "import" | "export" | "both";
  daysAhead: number;
  autoStatusDefault: boolean;
  targetAreaId?: string;
  /** Agenda secundária dedicada criada pelo app (escrita só vai pra ela). */
  appCalendarId?: string;
  /** Quando true, exportação só escreve em appCalendarId. */
  useAppCalendarOnly: boolean;
  /** Deletar task local quando o evento sumir do Google. */
  deleteOnRemoteRemoval: boolean;
}

export const DEFAULT_GCAL_SETTINGS: GoogleCalendarSettings = {
  clientId: "",
  enabled: false,
  paused: false,
  selectedCalendarIds: [],
  syncDirection: "both",
  daysAhead: 7,
  autoStatusDefault: true,
  useAppCalendarOnly: true,
  deleteOnRemoteRemoval: true,
};

export interface SyncLogEntry {
  at: string;
  message: string;
  ok: boolean;
}

const SETTINGS_KEY = "google-calendar-settings";
const LOG_KEY = "google-calendar-sync-log";
const CLIENT_ID_LS = "google-calendar-client-instance";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

/** ID estável deste cliente (browser/electron instance) p/ lock anti-duplicação. */
export function getClientInstanceId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_LS);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_LS, id);
    }
    return id;
  } catch { return "anon"; }
}

export function useGoogleCalendarStore() {
  const [settings, setSettingsState] = useState<GoogleCalendarSettings>(
    () => ({ ...DEFAULT_GCAL_SETTINGS, ...loadJson(SETTINGS_KEY, {}) })
  );
  const [log, setLogState] = useState<SyncLogEntry[]>(() => loadJson(LOG_KEY, []));

  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 50))); }, [log]);

  const updateSettings = useCallback((partial: Partial<GoogleCalendarSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }));
  }, []);

  const addLog = useCallback((message: string, ok = true) => {
    setLogState(prev => [{ at: new Date().toISOString(), message, ok }, ...prev].slice(0, 50));
  }, []);

  const clearLog = useCallback(() => setLogState([]), []);

  const clientInstanceId = useMemo(() => getClientInstanceId(), []);

  return { settings, updateSettings, log, addLog, clearLog, clientInstanceId };
}
