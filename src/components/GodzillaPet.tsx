import { useEffect, useRef, useState } from "react";
import sheet from "@/assets/godzilla-sheet-user.png";

/**
 * GodzillaPet — pequeno mascote pixel art que caminha aleatoriamente
 * na parte de baixo da tela.
 *
 * Layout do sprite sheet (1055x1077, grid 4x4 ≈ 264x269 por frame):
 *   Linha 0 (y=0):   walk frames 0..3   (virado p/ direita)
 *   Linha 1 (y=1):   walk frames 4..7   (virado p/ direita)  → ciclo de 8 frames
 *   Linha 2 (y=2):   idle frames 0..3   (virado p/ esquerda no original)
 *   Linha 3 (y=3):   walk extra; usamos col 0 como frame de "rugido"
 *
 * Comportamento: alterna entre andar (uma direção, alguns segundos), pausar
 * (idle/respirando), virar e andar pro outro lado. Raramente solta um rugido.
 *
 * Renderizado tamanho ~80px (visível mas não rouba a cena).
 */

// ---- Constantes do sheet ----
const SHEET_W = 1055;
const SHEET_H = 1077;
const COLS = 4;
const ROWS = 4;
const FRAME_W = SHEET_W / COLS; // ≈ 263.75
const FRAME_H = SHEET_H / ROWS; // ≈ 269.25

// Tamanho exibido na tela (px)
const DISPLAY = 80;
const SCALE = DISPLAY / FRAME_H;

// Animação
const WALK_FRAMES: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1],
];
const IDLE_FRAMES: Array<[number, number]> = [
  [0, 2], [1, 2], [2, 2], [3, 2],
];
const ROAR_FRAME: [number, number] = [0, 3];

const WALK_FRAME_MS = 140;     // velocidade da animação de andar
const IDLE_FRAME_MS = 320;     // respira mais devagar
const WALK_SPEED_PX_S = 28;    // pixels por segundo

type Mode = "walking" | "idle" | "roaring";

export function GodzillaPet() {
  // Posição em px relativos à viewport (canto inferior).
  const [x, setX] = useState(() => Math.random() * (window.innerWidth - DISPLAY));
  // dir: 1 = direita, -1 = esquerda. Sprite original olha p/ direita,
  // então invertemos com scaleX(-1) quando dir = -1.
  const [dir, setDir] = useState<1 | -1>(Math.random() > 0.5 ? 1 : -1);
  const [mode, setMode] = useState<Mode>("walking");
  const [frameIdx, setFrameIdx] = useState(0);

  // refs pra animação contínua sem disparar re-render por frame
  const xRef = useRef(x);
  const dirRef = useRef<1 | -1>(dir);
  const modeRef = useRef<Mode>(mode);
  xRef.current = x;
  dirRef.current = dir;
  modeRef.current = mode;

  // Loop de movimento (rAF) — só atualiza X enquanto andando
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (modeRef.current === "walking") {
        const maxX = window.innerWidth - DISPLAY;
        let nx = xRef.current + dirRef.current * WALK_SPEED_PX_S * dt;
        if (nx <= 0) {
          nx = 0;
          setDir(1);
        } else if (nx >= maxX) {
          nx = maxX;
          setDir(-1);
        }
        setX(nx);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Loop de troca de frames (animação do sprite)
  useEffect(() => {
    const ms =
      mode === "walking" ? WALK_FRAME_MS :
      mode === "roaring" ? 220 :
      IDLE_FRAME_MS;
    const id = window.setInterval(() => {
      setFrameIdx((i) => i + 1);
    }, ms);
    return () => clearInterval(id);
  }, [mode]);

  // Máquina de estados — alterna walking / idle / (raro) roaring
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      // Duração do estado atual
      let duration: number;
      if (modeRef.current === "walking") {
        duration = 4000 + Math.random() * 5000; // 4–9s andando
      } else if (modeRef.current === "idle") {
        duration = 1500 + Math.random() * 2500; // 1.5–4s parado
      } else {
        duration = 900; // rugido curto
      }
      const t = window.setTimeout(() => {
        if (cancelled) return;
        const cur = modeRef.current;
        if (cur === "walking") {
          // 15% de chance de soltar rugido, senão idle
          if (Math.random() < 0.15) {
            setMode("roaring");
          } else {
            setMode("idle");
          }
        } else if (cur === "idle") {
          // Ao sair do idle, possivelmente troca de direção
          if (Math.random() < 0.5) setDir((d) => (d === 1 ? -1 : 1));
          setMode("walking");
        } else {
          // depois de rugir, volta a andar
          setMode("walking");
        }
        setFrameIdx(0);
        schedule();
      }, duration);
      return () => clearTimeout(t);
    };
    const cleanup = schedule();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Frame atual conforme modo
  let cell: [number, number];
  if (mode === "walking") cell = WALK_FRAMES[frameIdx % WALK_FRAMES.length];
  else if (mode === "idle") cell = IDLE_FRAMES[frameIdx % IDLE_FRAMES.length];
  else cell = ROAR_FRAME;

  const [col, row] = cell;
  // background-position negativo desloca o sheet pra mostrar a célula certa.
  // Como escalamos o sheet inteiro, multiplicamos pelas dimensões escaladas.
  const bgX = -col * FRAME_W * SCALE;
  const bgY = -row * FRAME_H * SCALE;
  const bgSizeW = SHEET_W * SCALE;
  const bgSizeH = SHEET_H * SCALE;

  return (
    <div
      aria-hidden
      className="fixed pointer-events-none select-none"
      style={{
        left: `${x}px`,
        bottom: "8px",
        width: `${DISPLAY}px`,
        height: `${DISPLAY}px`,
        zIndex: 40,
        backgroundImage: `url(${sheet})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
        imageRendering: "pixelated",
        transform: dir === -1 ? "scaleX(-1)" : "scaleX(1)",
        transformOrigin: "center",
        filter: "drop-shadow(0 4px 4px hsl(0 0% 0% / 0.35))",
      }}
    />
  );
}
