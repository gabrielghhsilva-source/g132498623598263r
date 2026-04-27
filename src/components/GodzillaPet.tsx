import { useEffect, useRef, useState } from "react";
// Frames pré-fatiados (256x274 com sprite alinhado pelo pé) — sem bleeding.
import r0c0 from "@/assets/godzilla/r0c0.png";
import r0c1 from "@/assets/godzilla/r0c1.png";
import r0c2 from "@/assets/godzilla/r0c2.png";
import r0c3 from "@/assets/godzilla/r0c3.png";
import r1c0 from "@/assets/godzilla/r1c0.png";
import r1c1 from "@/assets/godzilla/r1c1.png";
import r1c2 from "@/assets/godzilla/r1c2.png";
import r1c3 from "@/assets/godzilla/r1c3.png";
import r2c0 from "@/assets/godzilla/r2c0.png";
import r2c1 from "@/assets/godzilla/r2c1.png";
import r2c2 from "@/assets/godzilla/r2c2.png";
import r2c3 from "@/assets/godzilla/r2c3.png";
import r3c0 from "@/assets/godzilla/r3c0.png";
import r3c1 from "@/assets/godzilla/r3c1.png";
import r3c2 from "@/assets/godzilla/r3c2.png";
import r3c3 from "@/assets/godzilla/r3c3.png";

/**
 * GodzillaPet — pequeno mascote pixel art andando no rodapé.
 *
 * Sprites:
 *   Linha 0/1: walk virado p/ DIREITA (8 frames de ciclo)
 *   Linha 2:   idle virado p/ ESQUERDA no original — usamos invertido
 *              quando pet olha p/ direita, e direto quando olha p/ esquerda.
 *   Linha 3 col 0: pose de rugido (boca aberta).
 *
 * Como evitamos os bugs anteriores:
 *   1. Frames são <img>s individuais já trimados → ZERO bleeding entre células.
 *   2. Movimento usa requestAnimationFrame escrevendo direto em style.transform
 *      via ref (sem setState a cada pixel) → sem re-render quebrando a animação
 *      do sprite e sem "tremedeira" no movimento.
 *   3. Direção é guardada em ref e lida pelo loop a cada frame, evitando
 *      closure stale que fazia ele "andar pra trás bugadinho".
 */

const WALK_FRAMES = [r0c0, r0c1, r0c2, r0c3, r1c0, r1c1, r1c2, r1c3];
// Frames idle são da linha 2 (que está virada pra esquerda no original).
// Vamos usar o mesmo array; o flip horizontal cuida da direção.
const IDLE_FRAMES = [r2c0, r2c1, r2c2, r2c3];
const ROAR_FRAME = r3c0;

const DISPLAY = 80;            // tamanho exibido
const WALK_FRAME_MS = 140;
const IDLE_FRAME_MS = 320;
const WALK_SPEED_PX_S = 30;

type Mode = "walking" | "idle" | "roaring";

export function GodzillaPet() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<Mode>("walking");
  const [frameIdx, setFrameIdx] = useState(0);
  const [dirTick, setDirTick] = useState(0); // força re-render quando dir muda

  // Refs para o loop de animação (evitam closure stale + re-render por frame)
  const xRef = useRef<number>(
    Math.random() * Math.max(0, window.innerWidth - DISPLAY),
  );
  const dirRef = useRef<1 | -1>(Math.random() > 0.5 ? 1 : -1);
  const modeRef = useRef<Mode>("walking");
  modeRef.current = mode;

  // Loop de movimento — escreve transform direto no DOM (sem setState)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp p/ evitar saltos
      last = now;
      const el = containerRef.current;
      if (el) {
        if (modeRef.current === "walking") {
          const maxX = window.innerWidth - DISPLAY;
          let nx = xRef.current + dirRef.current * WALK_SPEED_PX_S * dt;
          if (nx <= 0) {
            nx = 0;
            if (dirRef.current !== 1) {
              dirRef.current = 1;
              setDirTick((t) => t + 1);
            }
          } else if (nx >= maxX) {
            nx = maxX;
            if (dirRef.current !== -1) {
              dirRef.current = -1;
              setDirTick((t) => t + 1);
            }
          }
          xRef.current = nx;
        }
        // Sempre escreve a posição (não custa nada e mantém suave)
        el.style.transform = `translate3d(${Math.round(xRef.current)}px, 0, 0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Loop de troca de frames do sprite
  useEffect(() => {
    const ms =
      mode === "walking" ? WALK_FRAME_MS :
      mode === "roaring" ? 220 :
      IDLE_FRAME_MS;
    const id = window.setInterval(() => setFrameIdx((i) => i + 1), ms);
    return () => clearInterval(id);
  }, [mode]);

  // Máquina de estados de comportamento
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const next = () => {
      if (cancelled) return;
      const cur = modeRef.current;
      let duration: number;
      if (cur === "walking") duration = 4000 + Math.random() * 5000;
      else if (cur === "idle") duration = 1500 + Math.random() * 2500;
      else duration = 900;

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const c = modeRef.current;
        if (c === "walking") {
          if (Math.random() < 0.15) setMode("roaring");
          else setMode("idle");
        } else if (c === "idle") {
          if (Math.random() < 0.5) {
            dirRef.current = (dirRef.current === 1 ? -1 : 1) as 1 | -1;
            setDirTick((t) => t + 1);
          }
          setMode("walking");
        } else {
          setMode("walking");
        }
        setFrameIdx(0);
        next();
      }, duration);
    };
    next();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  // Escolhe frame atual
  let src: string;
  if (mode === "walking") src = WALK_FRAMES[frameIdx % WALK_FRAMES.length];
  else if (mode === "idle") src = IDLE_FRAMES[frameIdx % IDLE_FRAMES.length];
  else src = ROAR_FRAME;

  // Como linha 2 (idle) já está virada pra esquerda no original, e linha 0/1/3
  // estão viradas pra direita, precisamos de regras diferentes de espelhamento
  // pra que o pet sempre olhe na direção em que está andando.
  //   walking/roaring: dir=1 (direita) → sem flip; dir=-1 → flip
  //   idle:            dir=-1 (esquerda) → sem flip; dir=1 → flip
  const sourceFacesRight = mode !== "idle";
  const wantsRight = dirRef.current === 1;
  const flip = sourceFacesRight !== wantsRight;
  void dirTick; // garante que mudanças de dir re-renderizem o flip

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed pointer-events-none select-none"
      style={{
        left: 0,
        bottom: "8px",
        width: `${DISPLAY}px`,
        height: `${DISPLAY}px`,
        zIndex: 40,
        willChange: "transform",
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        width={DISPLAY}
        height={DISPLAY}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center bottom",
          imageRendering: "pixelated",
          transform: flip ? "scaleX(-1)" : undefined,
          filter: "drop-shadow(0 4px 4px hsl(0 0% 0% / 0.35))",
        }}
      />
    </div>
  );
}
