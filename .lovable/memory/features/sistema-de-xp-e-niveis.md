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
- **Godzilla Clássico** (Nv 1) — usa sprite-sheets COMPLETOS (walk/run/jump/charge/beam). Estágios NUNCA definem `idleSprite`/`walkFrames` (preservar atomic breath e demais animações do sheet). Apenas adicionam EFEITOS visuais: Despertar/Furioso/Berserker/Apex/Lenda Viva — Atomic Glow (Nv45 ganha aura roxa intensa + spine-glow ciano + partículas atômicas).
- **Shin Godzilla** (Nv 15) — cada estágio tem ciclo de walk de 4 frames (idle, step, step2, step) que dá animação real de pernas. Estágios: 2ª Forma Kamata-kun (Nv15), 3ª Shinagawa-kun (Nv22), 4ª Definitiva (Nv32), 4ª+ Crimson (Nv38), Awakened Apex Crimson Burn (Nv45 — sprite custom com fissuras crimson brilhantes e ember particles).

**Animação CSS no `GodzillaPet`:**
- Andando com walkFrames: `kaiju-idle-bob 0.6s` (sincroniza com 1 ciclo de 4 frames a 75ms = 300ms, dando peso).
- Skin custom parada: `kaiju-breath 2.4s` (respiração).
- Clássico (sem override): `kaiju-idle-bob 1.6s` (sutil; pernas vêm do sprite-sheet).

**Integração:** `Index.tsx` envolve `updateTaskStatus`, `toggleSubtaskOf` e `addContribution` com handlers que disparam `xp.awardTask/awardSubtask/awardContribution`. Toasts mostram +XP e level up.

**UI:**
- `LevelBadge` no header (sempre visível): Nv X + barra de XP + tooltip ao hover com skin/estágio/streak.
- `LevelPanel` em Configurações → Progresso: estatísticas do dia, lista de skins (desbloqueadas/bloqueadas), todos os estágios da skin ativa com nível requerido, histórico dos últimos 12 ganhos.
- Botão DEV `+500 XP` no header (left-click adiciona, right-click reseta).

**Sprites:** Shin em `src/assets/godzilla/shin/shin_form{1-4}_{idle,step,step2}.png` + `shin_awakened_{idle,step}.png`. Lenda Viva preview em `src/assets/godzilla/classic_legend_idle.png` (usado APENAS como `previewSprite` no painel/seletor — runtime usa o sheet original).
