import { useEffect, useRef, useState } from "react";

// === SPRITES ===
// Linha 1: walk (11 frames). Linha 2: run (12). Linha 3: jump (10).
// Linha 4: charge (6 frames de godzilla carregando) + beam (12 frames do jato crescendo).
// Todos os sprites estão alinhados pelo pé em canvas 96x96 (NEAREST upscale 3x),
// e cada um é UM componente conectado isolado — zero contaminação de sprites vizinhos.

import w0 from "@/assets/godzilla/walk_0.png";
import w1 from "@/assets/godzilla/walk_1.png";
import w2 from "@/assets/godzilla/walk_2.png";
import w3 from "@/assets/godzilla/walk_3.png";
import w4 from "@/assets/godzilla/walk_4.png";
import w5 from "@/assets/godzilla/walk_5.png";
import w6 from "@/assets/godzilla/walk_6.png";
import w7 from "@/assets/godzilla/walk_7.png";
import w8 from "@/assets/godzilla/walk_8.png";
import w9 from "@/assets/godzilla/walk_9.png";
import w10 from "@/assets/godzilla/walk_10.png";

import r0 from "@/assets/godzilla/run_0.png";
import r1 from "@/assets/godzilla/run_1.png";
import r2 from "@/assets/godzilla/run_2.png";
import r3 from "@/assets/godzilla/run_3.png";
import r4 from "@/assets/godzilla/run_4.png";
import r5 from "@/assets/godzilla/run_5.png";
import r6 from "@/assets/godzilla/run_6.png";
import r7 from "@/assets/godzilla/run_7.png";
import r8 from "@/assets/godzilla/run_8.png";
import r9 from "@/assets/godzilla/run_9.png";
import r10 from "@/assets/godzilla/run_10.png";
import r11 from "@/assets/godzilla/run_11.png";

import j0 from "@/assets/godzilla/jump_0.png";
import j1 from "@/assets/godzilla/jump_1.png";
import j2 from "@/assets/godzilla/jump_2.png";
import j3 from "@/assets/godzilla/jump_3.png";
import j4 from "@/assets/godzilla/jump_4.png";
import j5 from "@/assets/godzilla/jump_5.png";
import j6 from "@/assets/godzilla/jump_6.png";
import j7 from "@/assets/godzilla/jump_7.png";
import j8 from "@/assets/godzilla/jump_8.png";
import j9 from "@/assets/godzilla/jump_9.png";

import c0 from "@/assets/godzilla/charge_0.png";
import c1 from "@/assets/godzilla/charge_1.png";
import c2 from "@/assets/godzilla/charge_2.png";
import c3 from "@/assets/godzilla/charge_3.png";
import c4 from "@/assets/godzilla/charge_4.png";
import c5 from "@/assets/godzilla/charge_5.png";

import b0 from "@/assets/godzilla/beam_0.png";
import b1 from "@/assets/godzilla/beam_1.png";
import b2 from "@/assets/godzilla/beam_2.png";
import b3 from "@/assets/godzilla/beam_3.png";
import b4 from "@/assets/godzilla/beam_4.png";
import b5 from "@/assets/godzilla/beam_5.png";
import b6 from "@/assets/godzilla/beam_6.png";
import b7 from "@/assets/godzilla/beam_7.png";
import b8 from "@/assets/godzilla/beam_8.png";
import b9 from "@/assets/godzilla/beam_9.png";
import b10 from "@/assets/godzilla/beam_10.png";
import b11 from "@/assets/godzilla/beam_11.png";

const WALK = [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10];
const RUN = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11];
const JUMP = [j0, j1, j2, j3, j4, j5, j6, j7, j8, j9];
const CHARGE = [c0, c1, c2, c3, c4, c5];
const BEAM = [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11];

// === CONFIG ===
const DISPLAY = 80;             // tamanho exibido na página
const WALK_FRAME_MS = 75;       // walking usa frames de RUN — anima rápido mesmo andando devagar
const RUN_FRAME_MS = 70;        // corre rápido
const JUMP_FRAME_MS = 80;       // arco do pulo
const CHARGE_FRAME_MS = 140;
const BEAM_FRAME_MS = 60;       // jato cresce rápido
const IDLE_FRAME_MS = 380;

// Velocidade calibrada com ciclo de animação pra não "patinar":
// walk: 11×110ms = 1.21s/ciclo, ~3 passos/ciclo, ~16px/passo @ 80px → 40 px/s
// run: 12×70ms = 0.84s/ciclo, ~3 passos/ciclo, ~22px/passo → 78 px/s
const WALK_SPEED = 40;
const RUN_SPEED = 95;

type Mode = "walking" | "running" | "idle" | "jumping" | "charging" | "firing";

// Sprites originais miram pra ESQUERDA. Quando dir=1 (direita), espelhamos.
// Exceção: se algum sprite estiver pra direita, ajustamos no render.

export function GodzillaPet() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<Mode>("walking");
  const [frameIdx, setFrameIdx] = useState(0);
  const [, forceRender] = useState(0);

  // Refs do loop (evitam closure stale + re-render por frame)
  const xRef = useRef<number>(
    Math.random() * Math.max(0, window.innerWidth - DISPLAY),
  );
  const yOffsetRef = useRef<number>(0); // pulo vertical
  const dirRef = useRef<1 | -1>(Math.random() > 0.5 ? 1 : -1);
  const modeRef = useRef<Mode>("walking");
  modeRef.current = mode;
  const jumpStartRef = useRef<number>(0);

  // === Loop de movimento + arco de pulo ===
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const el = containerRef.current;
      if (el) {
        const m = modeRef.current;
        if (m === "walking" || m === "running") {
          const speed = m === "running" ? RUN_SPEED : WALK_SPEED;
          const maxX = window.innerWidth - DISPLAY;
          let nx = xRef.current + dirRef.current * speed * dt;
          if (nx <= 0) {
            nx = 0;
            if (dirRef.current !== 1) {
              dirRef.current = 1;
              forceRender((t) => t + 1);
            }
          } else if (nx >= maxX) {
            nx = maxX;
            if (dirRef.current !== -1) {
              dirRef.current = -1;
              forceRender((t) => t + 1);
            }
          }
          xRef.current = nx;
        } else if (m === "jumping") {
          // arco parabólico: ~0.7s no ar
          const t = (now - jumpStartRef.current) / 700;
          if (t >= 1) {
            yOffsetRef.current = 0;
          } else {
            // 4 * t * (1 - t) → arco máximo 1 em t=0.5
            yOffsetRef.current = 4 * t * (1 - t) * 28; // 28px de altura
            // Pequeno deslocamento horizontal pro pulo ter "vida"
            const maxX = window.innerWidth - DISPLAY;
            const nx = xRef.current + dirRef.current * 60 * dt;
            if (nx > 0 && nx < maxX) xRef.current = nx;
          }
        }
        el.style.transform = `translate3d(${Math.round(xRef.current)}px, ${-Math.round(yOffsetRef.current)}px, 0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // === Loop de troca de frames ===
  useEffect(() => {
    const ms =
      mode === "walking" ? WALK_FRAME_MS :
      mode === "running" ? RUN_FRAME_MS :
      mode === "jumping" ? JUMP_FRAME_MS :
      mode === "charging" ? CHARGE_FRAME_MS :
      mode === "firing" ? BEAM_FRAME_MS :
      IDLE_FRAME_MS;
    const id = window.setInterval(() => setFrameIdx((i) => i + 1), ms);
    return () => clearInterval(id);
  }, [mode]);

  // === Máquina de estados de comportamento ===
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const transitionTo = (next: Mode) => {
      if (cancelled) return;
      if (next === "jumping") jumpStartRef.current = performance.now();
      setMode(next);
      modeRef.current = next;
      setFrameIdx(0);
    };

    const schedule = () => {
      if (cancelled) return;
      const cur = modeRef.current;
      let duration: number;
      if (cur === "walking") duration = 4000 + Math.random() * 5000;
      else if (cur === "running") duration = 1500 + Math.random() * 2500;
      else if (cur === "idle") duration = 1500 + Math.random() * 2500;
      else if (cur === "jumping") duration = 700;
      else if (cur === "charging") duration = CHARGE.length * CHARGE_FRAME_MS + 200;
      else duration = BEAM.length * BEAM_FRAME_MS + 200; // firing

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const c = modeRef.current;
        let next: Mode = "walking";
        if (c === "walking") {
          const r = Math.random();
          if (r < 0.05) next = "charging";
          else if (r < 0.18) next = "running";
          else if (r < 0.25) next = "jumping";
          else next = "idle";
        } else if (c === "running") {
          next = Math.random() < 0.3 ? "jumping" : "walking";
        } else if (c === "idle") {
          if (Math.random() < 0.5) {
            dirRef.current = (dirRef.current === 1 ? -1 : 1) as 1 | -1;
            forceRender((t) => t + 1);
          }
          next = "walking";
        } else if (c === "jumping") {
          yOffsetRef.current = 0;
          next = Math.random() < 0.4 ? "running" : "walking";
        } else if (c === "charging") {
          next = "firing";
        } else {
          // firing → volta a andar
          next = "walking";
        }
        transitionTo(next);
        schedule();
      }, duration);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  // === Escolhe sprite atual ===
  let frames: string[];
  // "walking" usa os frames de RUN (animação mais viva), mas com velocidade de caminhada.
  if (mode === "walking") frames = RUN;
  else if (mode === "running") frames = RUN;
  else if (mode === "jumping") frames = JUMP;
  else if (mode === "charging") frames = CHARGE;
  else if (mode === "firing") frames = [CHARGE[CHARGE.length - 1]]; // continua na pose final
  else frames = [WALK[0]]; // idle: pose neutra

  const src =
    mode === "firing"
      ? CHARGE[CHARGE.length - 1]
      : frames[frameIdx % frames.length];

  // Beam: só aparece em "firing", e o frame avança com frameIdx
  const showBeam = mode === "firing";
  const beamFrame = showBeam ? BEAM[Math.min(frameIdx, BEAM.length - 1)] : null;

  // Direção: sprites originais olham pra DIREITA. dir=-1 (esquerda) precisa flip.
  const flip = dirRef.current === -1;

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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: flip ? "scaleX(-1)" : undefined,
          transformOrigin: "center bottom",
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          width={DISPLAY}
          height={DISPLAY}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center bottom",
            imageRendering: "pixelated",
            filter: "drop-shadow(0 4px 4px hsl(0 0% 0% / 0.35))",
          }}
        />
        {beamFrame && (
          <img
            src={beamFrame}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              // Boca fica do lado oposto à direção visível atual: como o container já é flipado
              // quando dir=-1, posicionar o beam pela LEFT faz ele sair pela boca em ambos os lados.
              left: `${DISPLAY * 0.85}px`,
              bottom: `${DISPLAY * 0.45}px`,
              height: `${DISPLAY * 0.35}px`,
              width: "auto",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 0 6px hsl(200 100% 60% / 0.7))",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
