# Plano — Fase 4 + Agenda recorrente + PWA badge

Ordem de execução: **agenda recorrente → Fase 4 → PWA badge → Fase 5 → adiados**. Vou parar e perguntar antes de começar Fase 5 e antes dos adiados (mexem em DnD/UX core).

---

## 1. Agenda recorrente — separar "Prontas repetitivas"

**Problema atual:** quando a instância gerada de uma task recorrente é marcada como done, ela some do painel Hoje e aparece junto das outras na coluna **Prontas**, "poluindo" e tirando a recorrente da agenda do dia.

**Modelo novo (sem migrações destrutivas):**
- Template recorrente continua igual (`recurrence` definido, sem `recurrenceSourceId`). Nunca aparece no Hoje — só gera instâncias.
- Instância (`recurrenceSourceId = template.id`) aparece no Hoje quando `dueDate === hoje`.
- Quando instância é marcada done:
  - **Continua aparecendo no painel Hoje** numa seção colapsável "✓ Feitas hoje" (não some).
  - Na coluna **Prontas** do Kanban, instâncias recorrentes vão para uma **sub-seção separada** "Repetitivas (hoje)" no topo, acima das não-recorrentes.
- Próximo dia: instância de ontem some do Hoje normalmente; nova instância é gerada com dueDate de hoje.

**Onde mexer:**
- `src/components/TodayPanel.tsx`: adicionar grupo "Feitas hoje" (collapsable, default fechado) mostrando instâncias done com `dueDate === hoje`. Hoje elas são filtradas fora.
- `src/components/DoneColumn.tsx`: separar `doneTasks` em `recurringToday` vs `others`, renderizar com header "Repetitivas (hoje)" / "Outras".
- Sem mudança de schema.

---

## 2. Fase 4 — Captura e organização

### 2a. Smart Inbox
- Área default `inbox` (📥 "Caixa de entrada") criada no primeiro load se não existir. Não-deletável (flag).
- Quick-add global (Ctrl+N ou botão FAB já existente) joga em inbox quando nenhum contexto de área.
- `useTaskStore.ts`: garantir inbox em `DEFAULT_AREAS` + migração; flag `protected: true` em `TaskArea`.
- `KanbanColumn`: esconder botão deletar quando `area.protected`.

### 2b. Templates de task
- Novo store `useTaskTemplateStore.ts` (localStorage criptografado): `{ id, name, input: AddTaskInput }`.
- `TaskDetailDialog`: botão "Salvar como template".
- `CommandPalette`: comando "Aplicar template…" + sub-busca.
- `QuickAddDialog`: dropdown "Usar template".

### 2c. Recorrência inteligente
- Estender `RecurrenceRule`:
  ```ts
  type: "weekly" | "monthly" | "businessDays" | "lastDayOfMonth" | "nthWeekdayOfMonth"
  interval?: number       // a cada N (dias úteis ou semanas)
  nth?: number            // 1ª, 2ª, última (-1)
  weekday?: number        // 0-6
  ```
- `getUpcomingDates` (em `timeUtils`) atualiza pra suportar os novos tipos.
- UI em `TaskDetailDialog` / `QuickAddDialog`: novo select de tipo.
- Tests em `taskOperations.test.ts` cobrindo businessDays e lastDayOfMonth.

### 2d. Calendário mensal
- Novo componente `MonthCalendarView.tsx`.
- Toggle no header do Kanban: **Kanban | Mês** (ícone calendar).
- Grid 7×6, célula com até 3 tasks visíveis + "…+N". Click no dia abre TodayPanel filtrado pra aquele dia (reaproveita Sheet).
- Drag entre dias = atualiza `dueDate`.

---

## 3. PWA badge

- `public/sw.js`: adicionar handler `message` que recebe `{ type: "set-badge", count }` e chama `self.navigator.setAppBadge?.(count)` / `clearAppBadge`.
- `src/hooks/useTaskStore.ts` (ou novo `usePwaBadge.ts`): efeito reativo a `todayTasks.length` (pending) → `navigator.serviceWorker.controller?.postMessage(...)`.
- Fallback silencioso quando API não disponível (Safari desktop, Firefox).

---

## 4. Fase 5 (depois de confirmar contigo)

- Modo Focus (overlay full-screen, esconde tudo menos task ativa + Pomodoro).
- Modo apresentação (zoom UI mínima, atalho `P`).
- Stats avançado (heatmap anual + streak por área + tempo por tag).

## 5. Adiados (último, com aviso)

- Bulk actions: shift-click acumula seleção, barra inferior aparece com "Mover / Tag / Prioridade / Deletar".
- Swipe gestures: handler de touch no `KanbanCard` (swipe → +1h, swipe ← amanhã). Risco de conflito com DnD nativo — vou testar isolado.

---

## Entrega

Esta rodada: blocos **1 + 2 + 3** (agenda recorrente, Fase 4 inteira, PWA badge). Paro depois e te chamo pra confirmar Fase 5.
