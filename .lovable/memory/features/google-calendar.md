---
name: Google Calendar Sync
description: Sincronização bidirecional com Google Agenda, auto-status por horário, mapeamento de cores e RRULE
type: feature
---
Sincronização Google Calendar (uso pessoal, OAuth via GIS no browser, sem backend).

**Arquivos-chave:**
- `src/lib/googleSyncLogic.ts` — lógica pura (cores, RRULE, auto-status, hash). Testes em `googleSyncLogic.test.ts`.
- `src/lib/googleCalendar.ts` — GIS loader + REST. Token salvo via `secureSet` em `google-calendar-tokens` (encrypted).
- `src/hooks/useGoogleCalendarStore.ts` — settings + log persistidos em localStorage plain.
- `src/hooks/useGoogleCalendarSync.ts` — loop de sync (5 min) + loop de auto-status (30s).
- `src/components/GoogleCalendarSettings.tsx` — UI dentro de Configurações → Google Agenda.

**Regras:**
- Cores: urgent→11 (Tomato), high→6 (Tangerine), medium→5 (Banana), low→7 (Peacock), none→default.
- Daily = weekly com `daysOfWeek: [0..6]`. RRULE FREQ=DAILY ↔ todos os 7 dias.
- Auto-status: roda a cada 30s; só age se `task.autoStatus !== false`. Antes→todo, durante→in-progress, depois→done.
- Anti-loop: `taskContentHash` (FNV-1a) + `googleEtag` (If-Match). Push só se hash mudou. 412 → reimporta.
- Eventos importados vão para área "Agenda Google" (auto-criada) ou área escolhida em settings.
- All-day events (sem `dateTime`) são ignorados na importação. Exceções de recorrência (`recurringEventId`) também (MVP).
- `singleEvents=false` na listagem: importa o mestre com RRULE, evita duplicar ocorrências.
- Escrita default em agenda dedicada "App Tasks" criada via `calendar.app.created` (toggle `useAppCalendarOnly`).
- Delete G→App: diff de IDs por janela; tasks órfãs removidas (toggle `deleteOnRemoteRemoval`).
- Delete App→G: enfileirado em outbox localStorage se offline; drena em `online` + sync.
- Lock anti-duplicação entre abas/clientes: `google-calendar-sync-lock` com `clientInstanceId` + TTL 60s.
- Escopos OAuth: `calendar.events` + `calendar.calendarlist.readonly` + `calendar.app.created` (mínimo necessário).

**Setup do usuário (uma vez):**
1. Google Cloud Console → criar OAuth Client ID (Web app)
2. Authorized JS origins: URL do preview + URL publicado
3. Habilitar Google Calendar API
4. Colar Client ID em Configurações → Google Agenda → conectar
