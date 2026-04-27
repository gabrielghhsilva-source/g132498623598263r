---
name: Tasks Kanban
description: Board de tarefas estilo ClickUp com colunas horizontais, drag-and-drop, prioridade, etiquetas, subtarefas, coluna virtual "Prontas", ditado por voz e modo voz inteligente
type: feature
---
A aba "Minhas Tarefas" usa um Kanban horizontal (KanbanBoard) inspirado no ClickUp:

- **Layout**: cada área (Trabalho, Jogos, etc.) é uma coluna lado a lado com scroll horizontal suave (wheel interceptado e interpolado via rAF). Click-and-drag para panar como no ClickUp.
- **Drag-and-drop**: tasks arrastáveis entre colunas via HTML5 DnD nativo. Soltar na coluna "Prontas" marca como done; soltar fora marca como todo.
- **Adição rápida**:
  - Botão `+` no topo de cada coluna abre input inline (Enter cria, Esc cancela).
  - Atalho global `N` em qualquer lugar abre QuickAddDialog completo.
  - **Microfone (ditado simples)**: botão ao lado do título no QuickAddDialog grava áudio (MediaRecorder) e envia para a edge function `transcribe-audio` que usa Lovable AI (google/gemini-2.5-flash) para transcrever em PT-BR — preenche apenas o campo de texto.
  - **Atalho global `V` → Voz inteligente**: abre `VoiceTaskDialog` que grava áudio e chama a edge function `voice-tasks`. Essa função usa Gemini com tool calling para transcrever + extrair MÚLTIPLAS tarefas estruturadas (título curto no infinitivo, área, dueDate, dueTime, prioridade, tagIds) numa única chamada. O usuário revisa numa prévia editável (pode ajustar/remover) antes de confirmar a criação em massa via `addTaskFull`. Função recebe contexto: lista de áreas (id+nome), tags disponíveis e data de hoje no fuso configurado. Sanitiza áreas/tags inválidas no servidor.
- **Coluna "Prontas" (virtual)**: agrega TODAS as tasks done de TODAS as áreas. Não persiste como TaskArea — derivada em runtime de `area.tasks.filter(status==="done")`. Tasks done são REMOVIDAS visualmente das colunas originais. Cada card mostra a área de origem acima. Toggle ocultar/mostrar persistido em `localStorage["kanban-hide-done"]`. Quando oculta, vira coluna fina vertical clicável.
- **Campos extras na task**:
  - `priority`: none|low|medium|high|urgent (badge + tira lateral)
  - `tagIds[]`: tags globais customizáveis
  - `subtasks[]`: checklist com progresso visual no card
- **TaskDetailDialog**: clique no card abre modal completo.
- **Lógica em `src/lib/taskOperations.ts`** (puro, testável). Helper `addMinutesToDue` em `timeUtils.ts` + `snoozeTask` no `useTaskStore` permitem adiar prazos.
- **NotificationPopup com snooze**: botões "+5 min" e "+30 min" no popup de notificação chamam `snoozeTask` para todas as tasks do evento. Service worker também emite `actions` nativas no Windows (PWA) que disparam snooze via mensagem `SNOOZE_TASKS`.
- **Cobertura de testes**: 40 testes passando (taskOperations, KanbanBoard incluindo coluna Prontas, SubtaskList, PrioritySelect, timeUtils/addMinutesToDue).

Edge functions relacionadas (ambas com `verify_jwt = false` em `supabase/config.toml`):
- `transcribe-audio` — transcrição simples PT-BR.
- `voice-tasks` — transcrição + extração estruturada de múltiplas tarefas (tool calling).

Componentes antigos removidos: `DraggableAreaList`, `TaskAreaCard`, `TaskItem`.
