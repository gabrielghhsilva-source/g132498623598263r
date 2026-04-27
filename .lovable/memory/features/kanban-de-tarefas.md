---
name: Tasks Kanban
description: Board de tarefas estilo ClickUp com colunas horizontais, drag-and-drop, prioridade, etiquetas, subtarefas, coluna virtual "Prontas" e ditado por voz
type: feature
---
A aba "Minhas Tarefas" usa um Kanban horizontal (KanbanBoard) inspirado no ClickUp:

- **Layout**: cada área (Trabalho, Jogos, etc.) é uma coluna lado a lado com scroll horizontal suave (wheel interceptado e interpolado via rAF). Click-and-drag para panar como no ClickUp.
- **Drag-and-drop**: tasks arrastáveis entre colunas via HTML5 DnD nativo. Soltar na coluna "Prontas" marca como done; soltar fora marca como todo.
- **Adição rápida**:
  - Botão `+` no topo de cada coluna abre input inline (Enter cria, Esc cancela).
  - Atalho global `N` em qualquer lugar abre QuickAddDialog completo.
  - **Microfone**: botão ao lado do título no QuickAddDialog grava áudio (MediaRecorder) e envia para a edge function `transcribe-audio` que usa Lovable AI (google/gemini-2.5-flash) para transcrever em PT-BR.
- **Coluna "Prontas" (virtual)**: agrega TODAS as tasks done de TODAS as áreas. Não persiste como TaskArea — derivada em runtime de `area.tasks.filter(status==="done")`. Tasks done são REMOVIDAS visualmente das colunas originais. Cada card mostra a área de origem acima. Toggle ocultar/mostrar persistido em `localStorage["kanban-hide-done"]`. Quando oculta, vira coluna fina vertical clicável.
- **Campos extras na task**:
  - `priority`: none|low|medium|high|urgent (badge + tira lateral)
  - `tagIds[]`: tags globais customizáveis
  - `subtasks[]`: checklist com progresso visual no card
- **TaskDetailDialog**: clique no card abre modal completo.
- **Lógica em `src/lib/taskOperations.ts`** (puro, testável). Helper `addMinutesToDue` em `timeUtils.ts` + `snoozeTask` no `useTaskStore` permitem adiar prazos.
- **NotificationPopup com snooze**: botões "+5 min" e "+30 min" no popup de notificação chamam `snoozeTask` para todas as tasks do evento. Auto-dismiss aumentado para 15s para dar tempo de clicar.
- **Cobertura de testes**: 40 testes passando (taskOperations, KanbanBoard incluindo coluna Prontas, SubtaskList, PrioritySelect, timeUtils/addMinutesToDue).

Componentes antigos removidos: `DraggableAreaList`, `TaskAreaCard`, `TaskItem`.
