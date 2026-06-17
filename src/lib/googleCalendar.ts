/**
 * Google Calendar API client (browser, OAuth via GIS token client).
 * Sem backend — feito para uso pessoal com client_id do próprio usuário.
 */
import { secureGet, secureSet } from "@/lib/crypto";

declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPES = "https://www.googleapis.com/auth/calendar";
const TOKEN_KEY = "google-calendar-tokens";

let gisLoaded: Promise<void> | null = null;
let tokenClient: any = null;

function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisLoaded;
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

export function loadStoredToken(): StoredToken | null {
  try {
    const raw = secureGet(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

function saveToken(t: StoredToken) {
  secureSet(TOKEN_KEY, JSON.stringify(t));
}

export function clearStoredToken() {
  secureSet(TOKEN_KEY, "");
  try { localStorage.removeItem("enc-google-calendar-tokens"); } catch {}
}

/** Pede um access token. Se prompt="" tenta silencioso (refresh implícito). */
export function requestAccessToken(clientId: string, opts: { silent?: boolean } = {}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGis();
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          const token: StoredToken = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + (Number(resp.expires_in) - 60) * 1000,
          };
          saveToken(token);
          resolve(token.accessToken);
        },
      });
      tokenClient.requestAccessToken({ prompt: opts.silent ? "" : "consent" });
    } catch (e: any) {
      reject(e);
    }
  });
}

/** Pega token válido (do cache ou renova silenciosamente). */
export async function getValidAccessToken(clientId: string): Promise<string> {
  const stored = loadStoredToken();
  if (stored && stored.accessToken && stored.expiresAt > Date.now()) {
    return stored.accessToken;
  }
  // Tenta silencioso
  try {
    return await requestAccessToken(clientId, { silent: true });
  } catch {
    return requestAccessToken(clientId, { silent: false });
  }
}

const API_BASE = "https://www.googleapis.com/calendar/v3";

async function apiCall(
  clientId: string,
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<any> {
  const token = await getValidAccessToken(clientId);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (res.status === 401 && retry) {
    clearStoredToken();
    return apiCall(clientId, path, init, false);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface GoogleCalendarMeta {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export async function listCalendars(clientId: string): Promise<GoogleCalendarMeta[]> {
  const data = await apiCall(clientId, "/users/me/calendarList?minAccessRole=writer");
  return (data.items || []).map((c: any) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary,
    backgroundColor: c.backgroundColor,
  }));
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  colorId?: string;
  recurrence?: string[];
  recurringEventId?: string;
  updated?: string;
  status?: string;
}

export async function listEvents(
  clientId: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
  const data = await apiCall(clientId, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return (data.items || []).filter((e: any) => e.status !== "cancelled");
}

export interface EventInput {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  colorId?: string;
  recurrence?: string[]; // ["RRULE:FREQ=DAILY"]
}

export async function createEvent(
  clientId: string, calendarId: string, input: EventInput,
): Promise<GoogleEvent> {
  return apiCall(clientId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startISO },
      end: { dateTime: input.endISO },
      colorId: input.colorId,
      recurrence: input.recurrence,
    }),
  });
}

export async function updateEvent(
  clientId: string, calendarId: string, eventId: string, input: EventInput,
): Promise<GoogleEvent> {
  return apiCall(clientId, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startISO },
      end: { dateTime: input.endISO },
      colorId: input.colorId,
      recurrence: input.recurrence,
    }),
  });
}

export async function deleteEvent(
  clientId: string, calendarId: string, eventId: string,
): Promise<void> {
  await apiCall(clientId, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}
