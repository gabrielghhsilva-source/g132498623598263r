---
name: Sistema de XP e Níveis
description: Gamificação com XP por tarefas, subtarefas, antecipação, streak diário, aporte mensal. Curva clássica RPG. Skins do Godzilla evoluem por nível (Clássico + Shin Godzilla com 4 formas canônicas)
type: feature
---
Sistema de gamificação implementado em `src/lib/xpEngine.ts` (puro/testável) + `src/hooks/useXpStore.ts` (estado persistido).

**Fórmula granular de XP:**
- Task: 10 base + prioridade (low+5, medium+10, high+20, urgent+35)
- Subtask: +2 cada
- Antecipação (antes do prazo): +15
- Atrasada: -5
- Bônus diário: +50 ao atingir 5 tasks no dia
- Aporte mensal: +200 (uma vez por investimento por mês) + 1 XP a cada R$10 aportado
- Streak: a cada 3 dias consecutivos, +0.1 multiplicador (cap x2.0)

**Curva de níveis (clássica RPG):** `xpRequired(n→n+1) = n*100`. Inversa: `level = floor((1 + sqrt(1 + 8*xp/100))/2)`.

**Skins (`src/lib/godzillaSkins.ts`):**
- **Godzilla Clássico** (Nv 1) — usa sprite-sheets existentes. Estágios: Despertar/Furioso/Berserker/Apex/Lenda Viva. Efeitos progressivos: spine-glow, aura, partículas, color-tint, ground-shake.
- **Shin Godzilla** (Nv 15) — sprites idle estáticos com micro-animação de respiração. Estágios canônicos: 2ª Forma (Kamata-kun rosa) Nv15, 3ª Forma (Shinagawa-kun bipede vermelho) Nv22, 4ª Forma (definitiva preta com flesh vermelho) Nv32, Awakened (espinhas magenta brilhantes) Nv45.

**Integração:** `Index.tsx` envolve `updateTaskStatus`, `toggleSubtaskOf` e `addContribution` com handlers que disparam `xp.awardTask/awardSubtask/awardContribution`. Toasts mostram +XP e level up.

**UI:**
- `LevelBadge` no header (sempre visível): Nv X + barra de XP + tooltip ao hover com skin/estágio/streak.
- `LevelPanel` em Configurações → Progresso: estatísticas do dia, lista de skins (desbloqueadas/bloqueadas), todos os estágios da skin ativa com nível requerido, histórico dos últimos 12 ganhos.

**Skins desbloqueadas auto** quando level ≥ unlockLevel. Toast notifica desbloqueio. Sprites do Shin Godzilla em `src/assets/godzilla/shin/shin_form{1-4}_idle.png` (gerados via IA, pixel art).
