/**
 * Catálogo de skins do Godzilla com evolução contínua por nível.
 *
 * Estratégia: cada skin tem N "stages" (sprite base) com `unlockLevel`.
 * O estágio ATIVO é o de maior `unlockLevel <= currentLevel`.
 * Adicionalmente, efeitos visuais (aura, partículas, brilho) são
 * desbloqueados em níveis intermediários para dar sensação de progressão CONTÍNUA.
 *
 * Skin "classic" usa os sprite-sheets já existentes (walk/run/jump/charge/beam)
 * — NUNCA define idleSprite/walkFrames pra não sobrescrever as animações reais
 * do sheet (atomic breath, jump, etc). Estágios do classic só desbloqueiam EFEITOS.
 *
 * Skin "shin" usa sprites idle/step gerados — ciclo de 3 frames por estágio
 * (idle → step → step2 → step) que dá sensação real de pernas se movendo.
 */

// === Sprites do Shin Godzilla ===
import shinForm1Idle from "@/assets/godzilla/shin/shin_form1_idle.png";
import shinForm1Step from "@/assets/godzilla/shin/shin_form1_step.png";
import shinForm1Step2 from "@/assets/godzilla/shin/shin_form1_step2.png";
import shinForm2Idle from "@/assets/godzilla/shin/shin_form2_idle.png";
import shinForm2Step from "@/assets/godzilla/shin/shin_form2_step.png";
import shinForm2Step2 from "@/assets/godzilla/shin/shin_form2_step2.png";
import shinForm3Idle from "@/assets/godzilla/shin/shin_form3_idle.png";
import shinForm3Step from "@/assets/godzilla/shin/shin_form3_step.png";
import shinForm3Step2 from "@/assets/godzilla/shin/shin_form3_step2.png";
import shinForm4Idle from "@/assets/godzilla/shin/shin_form4_idle.png";
import shinForm4Step from "@/assets/godzilla/shin/shin_form4_step.png";
import shinForm4Step2 from "@/assets/godzilla/shin/shin_form4_step2.png";
import shinAwakenedIdle from "@/assets/godzilla/shin/shin_awakened_idle.png";
import shinAwakenedStep from "@/assets/godzilla/shin/shin_awakened_step.png";

// === Preview Lenda Viva (clássico) — só pra vitrine no painel/seletor ===
import classicLegendIdle from "@/assets/godzilla/classic_legend_idle.png";

export type SkinId = "classic" | "shin";

export interface SkinStage {
  /** Nome do estágio que aparece no painel ("Forma Larval", "Awakened", etc) */
  name: string;
  /** Nível mínimo pra desbloquear esse estágio */
  unlockLevel: number;
  /** Único pra skins idle-only: caminho do sprite estático (preview/idle parado). */
  idleSprite?: string;
  /** Frames de caminhada do estágio (alterna em loop). Se ausente cai pra [idleSprite]. */
  walkFrames?: string[];
}

export interface SkinEffect {
  /** Nível em que o efeito passa a ser aplicado */
  fromLevel: number;
  /** Identificador renderizado pelo GodzillaPet */
  kind: "aura-glow" | "particle-trail" | "color-tint" | "spine-glow" | "ground-shake";
  /** Cor base CSS (hsl ou hex) usada pelo efeito quando aplicável */
  color?: string;
  /** Intensidade 0..1 */
  intensity?: number;
}

export interface SkinDef {
  id: SkinId;
  name: string;
  /** Nível mínimo pra essa SKIN ficar disponível no seletor */
  unlockLevel: number;
  /** Descrição curta exibida no seletor */
  description: string;
  /** Sprite usado como ícone no seletor (preview) */
  previewSprite: string;
  /** Estágios visuais ordenados por unlockLevel crescente */
  stages: SkinStage[];
  /** Efeitos progressivos */
  effects: SkinEffect[];
}

export const SKINS: SkinDef[] = [
  {
    id: "classic",
    name: "Godzilla Clássico",
    unlockLevel: 1,
    description: "O rei dos kaijus. Animações completas: andar, correr, pular, atomic breath.",
    previewSprite: classicLegendIdle,
    stages: [
      // IMPORTANTE: nenhum estágio do classic define idleSprite/walkFrames,
      // pra preservar o sprite-sheet animado original (walk/run/jump/charge/beam).
      { name: "Despertar", unlockLevel: 1 },
      { name: "Furioso", unlockLevel: 5 },
      { name: "Berserker", unlockLevel: 12 },
      { name: "Apex Predator", unlockLevel: 25 },
      { name: "Lenda Viva — Atomic Glow", unlockLevel: 45 },
    ],
    effects: [
      { fromLevel: 5, kind: "spine-glow", color: "hsl(200 100% 60%)", intensity: 0.4 },
      { fromLevel: 12, kind: "aura-glow", color: "hsl(200 100% 60%)", intensity: 0.5 },
      { fromLevel: 20, kind: "particle-trail", color: "hsl(200 100% 65%)", intensity: 0.6 },
      { fromLevel: 25, kind: "color-tint", color: "hsl(190 90% 55%)", intensity: 0.3 },
      { fromLevel: 35, kind: "ground-shake", intensity: 0.4 },
      // Lenda Viva: aura roxa intensa + spine-glow ciano + partículas atômicas
      { fromLevel: 45, kind: "spine-glow", color: "hsl(280 100% 70%)", intensity: 0.9 },
      { fromLevel: 45, kind: "aura-glow", color: "hsl(280 100% 65%)", intensity: 0.95 },
      { fromLevel: 45, kind: "particle-trail", color: "hsl(190 100% 70%)", intensity: 0.85 },
    ],
  },
  {
    id: "shin",
    name: "Shin Godzilla",
    unlockLevel: 15,
    description: "Evolui em formas canônicas: do larval ao Awakened Apex.",
    previewSprite: shinForm3Idle,
    stages: [
      {
        name: "2ª Forma — Kamata-kun",
        unlockLevel: 15,
        idleSprite: shinForm1Idle,
        walkFrames: [shinForm1Idle, shinForm1Step, shinForm1Step2, shinForm1Step],
      },
      {
        name: "3ª Forma — Shinagawa-kun",
        unlockLevel: 22,
        idleSprite: shinForm2Idle,
        walkFrames: [shinForm2Idle, shinForm2Step, shinForm2Step2, shinForm2Step],
      },
      {
        name: "4ª Forma — Definitiva",
        unlockLevel: 32,
        idleSprite: shinForm3Idle,
        walkFrames: [shinForm3Idle, shinForm3Step, shinForm3Step2, shinForm3Step],
      },
      {
        name: "4ª Forma+ — Crimson",
        unlockLevel: 38,
        idleSprite: shinForm4Idle,
        walkFrames: [shinForm4Idle, shinForm4Step, shinForm4Step2, shinForm4Step],
      },
      {
        name: "Awakened Apex — Crimson Burn",
        unlockLevel: 45,
        idleSprite: shinAwakenedIdle,
        walkFrames: [shinAwakenedIdle, shinAwakenedStep, shinAwakenedIdle, shinAwakenedStep],
      },
    ],
    effects: [
      { fromLevel: 18, kind: "spine-glow", color: "hsl(340 100% 55%)", intensity: 0.45 },
      { fromLevel: 25, kind: "aura-glow", color: "hsl(340 100% 50%)", intensity: 0.55 },
      { fromLevel: 32, kind: "particle-trail", color: "hsl(340 100% 60%)", intensity: 0.7 },
      { fromLevel: 40, kind: "ground-shake", intensity: 0.5 },
      // Awakened Apex: aura crimson intensa + ember trail
      { fromLevel: 45, kind: "spine-glow", color: "hsl(355 100% 60%)", intensity: 0.95 },
      { fromLevel: 45, kind: "aura-glow", color: "hsl(350 100% 50%)", intensity: 0.95 },
      { fromLevel: 45, kind: "particle-trail", color: "hsl(20 100% 55%)", intensity: 0.9 },
    ],
  },
];

export function getSkin(id: SkinId): SkinDef {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

/** Retorna o estágio ATIVO da skin para o nível atual. Sempre retorna pelo menos o stage[0]. */
export function getActiveStage(skin: SkinDef, level: number): SkinStage {
  let active = skin.stages[0];
  for (const stage of skin.stages) {
    if (level >= stage.unlockLevel) active = stage;
  }
  return active;
}

/** Retorna efeitos atualmente ativos pra essa skin/nível. */
export function getActiveEffects(skin: SkinDef, level: number): SkinEffect[] {
  return skin.effects.filter(e => level >= e.fromLevel);
}

/** É a skin desbloqueada pelo nível atual? */
export function isSkinUnlocked(skin: SkinDef, level: number): boolean {
  return level >= skin.unlockLevel;
}
