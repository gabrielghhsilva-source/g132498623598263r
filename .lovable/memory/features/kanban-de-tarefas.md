---
name: Tasks Kanban
description: Board de tarefas estilo ClickUp com colunas horizontais, drag-and-drop entre áreas, prioridade, etiquetas customizáveis e subtarefas
type: feature
---
A aba "Minhas Tarefas" usa um Kanban horizontal (KanbanBoard) inspirado no ClickUp:

- **Layout**: cada área (Trabalho, Jogos, etc.) é uma coluna lado a lado com scroll horizontal. No mobile mantém colunas com snap.
- **Drag-and-drop**: tasks arrastáveis entre colunas via HTML5 DnD nativo (sem libs).
- **Adição rápida**:
  - Botão `+` no topo de cada coluna abre input inline (Enter cria, Esc cancela).
  - Atalho global `N` em qualquer lugar abre QuickAddDialog completo (com prioridade, tags, subtarefas via textarea uma-por-linha, Ctrl/⌘+Enter envia). N é ignorado quando foco está em input.
- **Campos extras na task**:
  - `priority`: none|low|medium|high|urgent (com badge colorido + tira lateral no card)
  - `tagIds[]`: tags globais customizáveis (cor + nome), gerenciadas no useTaskStore (`addTag/deleteTag`)
  - `subtasks[]`: checklist com progresso visual no card
- **TaskDetailDialog**: clique no card abre modal completo com todos os campos editáveis + mover entre áreas via dropdown.
- **Lógica em `src/lib/taskOperations.ts`** (puro, testável): `makeTask`, `moveTaskBetweenAreas`, `addSubtask`, etc.
- **Cobertura de testes**: 32 testes passando (taskOperations + KanbanBoard + SubtaskList + PrioritySelect).

Componentes antigos removidos: `DraggableAreaList`, `TaskAreaCard`, `TaskItem`.
