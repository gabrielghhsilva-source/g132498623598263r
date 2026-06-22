# Roadmap aprovado

Decisões travadas:
- Hoje = **botão flutuante** que abre **painel cheio**, modo padrão **Lista**.
- Todas as 20 ideias entram, divididas em fases pra não quebrar nada.

---

## Fase 1 — Rework do "Hoje" (entrega imediata)

- Remover aba lateral atual; criar **FAB** (canto inferior direito) com badge de contagem.
- Atalho `T` abre/fecha. Estado persistido em localStorage.
- Painel cheio (Sheet lateral direita, largura redimensionável, mín 360 / máx 720px).
- Header com toggle de modo: **Lista** (default) · Timeline (atual) · Agenda.
- Modo Lista:
  - Checkbox grande, edição inline de texto e horário, swipe/atalhos pra adiar (1h, amanhã).
  - Drag interno pra reordenar.
  - Drag de uma task do Kanban → solta no FAB/painel = define dueDate hoje.
  - Drag pra fora do painel = remove dueDate.
- Bloco "Foco agora" no topo: próxima task + countdown + botão Pomodoro (25/5).

## Fase 2 — Performance (silencioso, sem mudança visual)

1. Debounce de 300ms no save do localStorage.
2. `React.memo` + selectors no Kanban.
3. `React.lazy` nas abas Menu e Ferramentas.
4. Migração localStorage → IndexedDB (com fallback) pro store de tasks.
5. Web Worker pro crypto.
6. Virtual scroll no Kanban (só se coluna > 50 cards).

## Fase 3 — Produtividade core

7. **Command Palette `Ctrl+K`** (criar/buscar/navegar/ações).
8. **Undo global `Ctrl+Z`** (stack de 20 ações reversíveis).
9. **Bulk actions** no Kanban (shift-click + barra de ações).
10. **Snooze rápido** com gestos no card (swipe →).
11. **Atalhos contextuais** documentados em `?`.

## Fase 4 — Captura e organização

12. **Smart Inbox** (área default pra entradas rápidas sem categoria).
13. **Templates de task** (salvar/aplicar).
14. **Recorrência inteligente** (a cada X dias úteis, último dia do mês, etc.).
15. **Calendário mensal** (nova view dentro do Kanban toggle).

## Fase 5 — Foco e visualização

16. **Modo Focus** (esconde tudo menos a task ativa + timer).
17. **Modo apresentação** (zoom + UI mínima pra mostrar pra alguém).
18. **Stats avançado** (heatmap anual, streak, tempo por tag).
19. **PWA badge** com contagem de tasks pendentes.

## Fase 6 — Dados

20. **Export/Import .json criptografado** (backup manual).

---

## Execução

Faço **Fase 1 agora** (escopo bem definido, alto impacto). Depois você escolhe se vamos por ordem ou pula pra alguma fase específica.

Confirma que posso começar a Fase 1 ou prefere reordenar algo?