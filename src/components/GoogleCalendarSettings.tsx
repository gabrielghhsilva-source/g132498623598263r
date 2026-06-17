import { useState } from "react";
import { Calendar, RefreshCw, Plug, Plug2, ExternalLink, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleCalendarSettings, SyncLogEntry } from "@/hooks/useGoogleCalendarStore";
import { GoogleCalendarMeta } from "@/lib/googleCalendar";
import { TaskArea } from "@/lib/types";

interface Props {
  settings: GoogleCalendarSettings;
  onUpdate: (patch: Partial<GoogleCalendarSettings>) => void;
  log: SyncLogEntry[];
  onClearLog: () => void;
  isConnected: boolean;
  isSyncing: boolean;
  calendars: GoogleCalendarMeta[];
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onSyncNow: () => Promise<void>;
  onRefreshCalendars: () => Promise<void>;
  areas: TaskArea[];
}

export function GoogleCalendarSettingsPanel({
  settings, onUpdate, log, onClearLog,
  isConnected, isSyncing, calendars,
  onConnect, onDisconnect, onSyncNow, onRefreshCalendars,
  areas,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try { await onConnect(); }
    catch (e: any) { setError(e.message); }
  };

  const handleSync = async () => {
    setError(null);
    try { await onSyncNow(); }
    catch (e: any) { setError(e.message); }
  };

  const toggleCalendar = (id: string) => {
    const next = settings.selectedCalendarIds.includes(id)
      ? settings.selectedCalendarIds.filter(c => c !== id)
      : [...settings.selectedCalendarIds, id];
    onUpdate({ selectedCalendarIds: next });
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Calendar className="w-4 h-4" />
        <span className="flex-1 font-medium">
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
        {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Client ID */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">OAuth Client ID (Google Cloud)</label>
        <Input
          value={settings.clientId}
          onChange={e => onUpdate({ clientId: e.target.value })}
          placeholder="123...apps.googleusercontent.com"
          className="text-xs"
        />
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Como criar <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Conectar/Desconectar */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button size="sm" onClick={handleConnect} disabled={!settings.clientId} className="flex-1">
            <Plug className="w-3.5 h-3.5 mr-1.5" /> Conectar
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={handleSync} disabled={isSyncing} className="flex-1">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar agora
            </Button>
            <Button size="sm" variant="outline" onClick={onDisconnect}>
              <Plug2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Toggles principais */}
      {isConnected && (
        <>
          <div className="space-y-2.5">
            <Toggle
              label="Sincronização ativa"
              checked={settings.enabled}
              onChange={v => onUpdate({ enabled: v })}
            />
            <Toggle
              label="Pausar temporariamente"
              checked={settings.paused}
              onChange={v => onUpdate({ paused: v })}
            />
            <Toggle
              label="Auto-status pelo horário (padrão para novas)"
              checked={settings.autoStatusDefault}
              onChange={v => onUpdate({ autoStatusDefault: v })}
            />
          </div>

          {/* Direção */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Direção</label>
            <select
              value={settings.syncDirection}
              onChange={e => onUpdate({ syncDirection: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs rounded-md border border-input bg-background"
            >
              <option value="both">Bidirecional (recomendado)</option>
              <option value="import">Só importar do Google</option>
              <option value="export">Só enviar pro Google</option>
            </select>
          </div>

          {/* Dias à frente */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Janela de importação (dias)</label>
            <Input
              type="number" min={1} max={60}
              value={settings.daysAhead}
              onChange={e => onUpdate({ daysAhead: Math.max(1, Math.min(60, Number(e.target.value))) })}
              className="text-xs"
            />
          </div>

          {/* Área alvo */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Área para eventos importados</label>
            <select
              value={settings.targetAreaId || ""}
              onChange={e => onUpdate({ targetAreaId: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-xs rounded-md border border-input bg-background"
            >
              <option value="">Criar/Usar "Agenda Google"</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          {/* Lista de calendários */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Agendas a sincronizar</label>
              <button onClick={onRefreshCalendars} className="text-[10px] text-muted-foreground hover:text-foreground">
                Atualizar
              </button>
            </div>
            {calendars.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Nenhuma agenda carregada</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {calendars.map(cal => {
                  const checked = settings.selectedCalendarIds.length === 0
                    ? cal.primary === true
                    : settings.selectedCalendarIds.includes(cal.id);
                  return (
                    <label key={cal.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleCalendar(cal.id)} />
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cal.backgroundColor || "#888" }}
                      />
                      <span className="text-xs truncate">{cal.summary}</span>
                      {cal.primary && <span className="text-[9px] text-muted-foreground">(principal)</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Log */}
          {log.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Histórico</label>
                <button onClick={onClearLog} className="text-[10px] text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto text-[10px]">
                {log.slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded bg-muted/30">
                    {entry.ok ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{entry.message}</div>
                      <div className="text-muted-foreground">{new Date(entry.at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-xs"
    >
      <span>{label}</span>
      <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
