# Project Memory

## Core
- **Storage/Offline**: Encrypted localStorage for data, IndexedDB for media. No external media URLs.
- **Security/API**: Password is `CaveCreate2026*`. External API keys (Alpha Vantage) MUST go through Edge Functions.
- **UI/Nav**: Card stack navigation with hover fan effect and proximity buffer. Single "Settings" button.
- **Forbidden**: Do not add passive income or debt tracking to Investments (removed for simplicity). Do not re-add XP/levels/Godzilla mascot — removidos por deixarem o app pesado e fora do escopo de site pessoal.
- **Tasks**: Kanban horizontal estilo ClickUp. Lógica pura em `src/lib/taskOperations.ts`. Sempre adicionar testes ao mexer no fluxo de tasks.

## Memories
- [Storage Tech](mem://tech/armazenamento) — Offline-first storage rules (localStorage, IndexedDB, Edge Functions)
- [Security & Auth](mem://auth/seguranca-e-privacidade) — Hardcoded password, encryption details, and login UI rules
- [Themes & Colors](mem://style/temas-e-cores) — Pre-defined and fully custom themes including button styling
- [Backgrounds](mem://style/planos-de-fundo) — Advanced backgrounds: solid, gradients, particles, local media
- [Card Navigation](mem://ui/navegacao-por-cartas) — Card stack nav with fan effect and proximity buffer
- [UI Experience](mem://ui/experiencia-do-usuario) — Preloader, sliding panels, smooth transitions, unified Settings
- [Task Management](mem://features/organizacao-de-tarefas) — Task areas, long-press reorder, individual minimization
- [Task Details](mem://features/personalizacao-de-tarefas) — Task visuals, comments, and weekly/monthly auto-recurrence
- [Tasks Kanban](mem://features/kanban-de-tarefas) — Board horizontal estilo ClickUp, DnD entre áreas, prioridade, tags, subtarefas, atalho N
- [Task Stats](mem://features/indicadores-de-progresso) — Real-time stats for done, to do, in progress, delayed tasks
- [Notifications](mem://features/notificacoes-e-prazos) — Custom alerts, custom sound upload, overdue handling
- [Today Panel](mem://features/painel-lateral-hoje) — Floating right panel for today's due tasks
- [Investments](mem://features/dashboard-de-investimentos) — Tracking logic, variable contributions, and explicitly forbidden features
- [Stock Market](mem://features/mercado-de-acoes) — 80+ pre-loaded local assets, Alpha Vantage via Edge Function
- [Salary Management](mem://features/gestao-salarial) — Salary + Extra - Expenses. Integrates with investments
- [Time Management](mem://features/gestao-de-tempo) — Manual timezone config (e.g., UTC-3) for accurate deadlines
- [Idle Game](mem://features/clicker-game) — 'Loop Tree' idle game, energy production, prestige loops
- [Data Reset](mem://features/reset-de-dados) — Total data wipe for localStorage, sessionStorage, IndexedDB
