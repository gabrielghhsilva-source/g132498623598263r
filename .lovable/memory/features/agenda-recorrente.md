---
name: Agenda — recorrentes concluídas
description: Tasks recorrentes concluídas hoje ficam numa seção separada para não poluir a agenda nem a coluna Prontas
type: feature
---
Instâncias recorrentes (`recurrenceSourceId` setado) com `dueDate === hoje` e `status === done`:
- Aparecem no painel Hoje numa seção colapsável "Feitas hoje (repetitivas)" no rodapé (default fechado), com botão pra desfazer.
- Na coluna Prontas do Kanban são agrupadas no topo sob "🔁 Repetitivas (hoje)", separadas das outras concluídas.
- Store expõe `todayDoneRecurring` em paralelo a `todayTasks`.

Inbox: área "Caixa de entrada" (`id: inbox`, `protected: true`) é garantida em todo load (ensureInbox). Não pode ser deletada.

PWA badge: store posta `{type:"SET_BADGE", count}` pro service worker e chama `navigator.setAppBadge` direto sempre que `todayTasks.length` muda.
