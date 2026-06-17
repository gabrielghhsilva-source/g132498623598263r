# Integração com Google Agenda

## Visão geral
Sincronização **bidirecional** entre o app e o Google Calendar do **usuário final** (cada pessoa conecta a própria conta), com automação de status por horário, notificações e suporte a recorrências.

> ⚠️ Importante: como cada usuário precisa conectar a **própria conta Google**, isso exige **OAuth por usuário** (não o conector de workspace). Você (ou cada usuário) vai precisar criar credenciais OAuth no Google Cloud Console uma vez. Eu te guio passo a passo quando começarmos.

---

## O que vai funcionar

### 1. Importar eventos da Agenda → Tasks
- Lê eventos dos próximos N dias (configurável, padrão 14).
- Cria uma task espelhada com nome, descrição, data, hora início e fim.
- Eventos recorrentes do Google viram tasks recorrentes no app.
- Área de destino configurável (ex: "Agenda Google") ou regra por palavra-chave/cor do evento.

### 2. Automação de status por horário (o pulo do gato)
Um relógio interno checa a cada minuto:
- **Antes do início** → `A fazer`
- **Entre início e fim** → `Fazendo` (muda automaticamente)
- **Depois do fim** → `Pronto` (só se você não marcou manualmente; respeita override do usuário)
- Toggle por task: "Auto-status pelo horário" (liga/desliga individualmente).

### 3. Notificações
- Usa o sistema de notificações que já existe no app.
- Notifica X min antes do início (configurável, reusa `NotificationSettings`).
- Notificação extra opcional no fim do evento ("Você terminou X?").

### 4. Exportar Tasks → Agenda
- Toda task com data + horário pode ser enviada à agenda.
- Mapeia **prioridade → cor do evento**:
  - Urgente → Vermelho (Tomato)
  - Alta → Laranja (Tangerine)
  - Média → Amarelo (Banana)
  - Baixa → Azul (Peacock)
  - Nenhuma → Padrão
- Descrição da task vira descrição do evento.
- Subtasks viram checklist no corpo da descrição.
- Atualizações no app (texto, hora, prioridade) propagam para o evento.
- Exclusão no app remove da agenda (com confirmação).

### 5. Recorrências
- Cria eventos com RRULE no Google (diário, semanal, mensal).
- Mapeia `RecurrenceRule` do app → RRULE iCal.
- Funciona nos dois sentidos.

### 6. Anti-conflito (evita loop infinito de sync)
- Cada item guarda `googleEventId` + `lastSyncedAt` + hash do conteúdo.
- "Última escrita ganha" baseada em timestamp.
- Botão "Forçar sync agora" + sync automático a cada 5 min quando o app está aberto.

---

## Ideias extras que sugiro incluir

1. **Múltiplas agendas** — escolher quais agendas do Google sincronizar (ex: só "Pessoal", ignorar "Aniversários").
2. **Filtro por palavra-chave** — eventos com `[ignore]` no título não viram task.
3. **Detecção de conflito de horário** — alerta se você criar task que se sobrepõe a outro evento.
4. **Resumo do dia** — ao abrir o app, painel "Sua agenda de hoje" já mesclada com tasks.
5. **Modo "só leitura"** — opção para apenas importar, sem escrever na agenda (mais seguro pra testar).
6. **Botão pausar sync** — útil quando você está reorganizando muita coisa.
7. **Log de sincronização** — pequeno histórico das últimas operações (debug).

---

## Detalhes técnicos

- **Auth**: OAuth 2.0 do Google com escopo `https://www.googleapis.com/auth/calendar`. Tokens (access + refresh) criptografados no `localStorage` (mesmo esquema do `secureSet`).
- **Refresh**: feito client-side antes de cada chamada quando o access token está perto de expirar.
- **API**: Google Calendar API v3, chamadas diretas via `fetch` (sem backend, mantém offline-first do app).
- **Polling**: `setInterval` de 5 min para sync + `setInterval` de 1 min para auto-status.
- **Edge function opcional**: só se quisermos esconder o client_secret. Para apps desktop/PWA pessoais, o fluxo PKCE permite OAuth sem client_secret (mais simples e seguro).
- **Arquivos novos**: `src/lib/googleCalendar.ts` (API), `src/hooks/useGoogleCalendarSync.ts` (sync), `src/components/GoogleCalendarSettings.tsx` (UI nas Settings), campos novos em `Task` (`googleEventId`, `googleCalendarId`, `autoStatus`, `lastSyncedAt`).

---

## Perguntas antes de começar

1. **Quem vai conectar a agenda?** Só você (eu posso codificar com client_id fixo seu) ou qualquer usuário do app (cada um conecta a própria)?
2. **Direção do sync de cara**: bidirecional completo desde o início, ou começamos **só importando** do Google e depois ligamos o envio (mais seguro pra testar sem bagunçar sua agenda real)?
3. **Auto-status**: ligado por padrão em todas as tasks vindas da agenda, ou opt-in por task?
4. **Janela de importação**: 14 dias à frente é OK, ou prefere outro padrão (7, 30)?
