import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";
import seaweedImg from "@/assets/abyssal-seaweed.png";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * For "cyan" (Abissal): glowing Cthulhu fused into background + bubbles
 * + scattered seaweed strands evoking deep-sea ruins.
 */
export function ThemeDecorations({ theme, enabled }: Props) {
  if (!enabled) return null;
  if (theme === "cyan") return <AbyssalDecorations />;
  return null;
}

// Pre-scattered seaweed positions — evokes drifting deep-sea flora
const SEAWEED_PIECES = [
  { top: "8%",  left: "-3%",  size: 220, rot: -15, opacity: 0.55, delay: 0,   dur: 9,  flip: false },
  { top: "18%", right: "-4%", size: 280, rot: 25,  opacity: 0.6,  delay: 1.5, dur: 11, flip: true  },
  { top: "42%", left: "8%",   size: 180, rot: 35,  opacity: 0.45, delay: 3,   dur: 10, flip: false },
  { top: "55%", right: "12%", size: 240, rot: -20, opacity: 0.55, delay: 0.8, dur: 12, flip: true  },
  { top: "72%", left: "20%",  size: 260, rot: 10,  opacity: 0.5,  delay: 2.2, dur: 10, flip: false },
  { top: "85%", right: "6%",  size: 300, rot: -10, opacity: 0.6,  delay: 1,   dur: 13, flip: true  },
  { top: "30%", left: "45%",  size: 160, rot: 60,  opacity: 0.35, delay: 4,   dur: 11, flip: false },
  { top: "65%", left: "55%",  size: 200, rot: -30, opacity: 0.4,  delay: 2.8, dur: 9,  flip: true  },
];

function AbyssalDecorations() {
  // Bubbles — generated once with stable pseudo-random props
  const bubbles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: (i * 47) % 100,
    size: 5 + ((i * 7) % 20),
    delay: (i * 1.1) % 14,
    duration: 14 + ((i * 3) % 14),
    opacity: 0.18 + ((i * 0.07) % 0.3),
  }));

  return (
    <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden">
      {/* Outer cyan glow halo behind Cthulhu — extends the aura */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(120vw,1400px)] h-[min(120vh,1400px)] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(180 90% 45% / 0.18) 0%, hsl(180 90% 40% / 0.08) 30%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* Cthulhu — large, fused with background via screen blend */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(110vw,1200px)] h-[min(110vh,1200px)] bg-no-repeat bg-center bg-contain animate-cthulhu-pulse"
        style={{
          backgroundImage: `url(${cthulhuImg})`,
          mixBlendMode: "screen",
          opacity: 0.85,
        }}
      />

      {/* Scattered seaweed — drifting in the current */}
      {SEAWEED_PIECES.map((sw, i) => (
        <img
          key={i}
          src={seaweedImg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute animate-seaweed-drift"
          style={{
            top: sw.top,
            left: (sw as any).left,
            right: (sw as any).right,
            width: `${sw.size}px`,
            height: "auto",
            opacity: sw.opacity,
            transform: `rotate(${sw.rot}deg)${sw.flip ? " scaleX(-1)" : ""}`,
            transformOrigin: "center",
            animationDelay: `${sw.delay}s`,
            animationDuration: `${sw.dur}s`,
            filter: "hue-rotate(140deg) saturate(0.7) brightness(0.55) drop-shadow(0 0 12px hsl(180 80% 40% / 0.4))",
            mixBlendMode: "screen",
          }}
        />
      ))}

      {/* Rising bubbles */}
      {bubbles.map(b => (
        <span
          key={b.id}
          className="absolute rounded-full animate-bubble-rise"
          style={{
            left: `${b.left}%`,
            bottom: `-${b.size * 2}px`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            background: "radial-gradient(circle at 30% 30%, hsl(180 90% 75% / 0.6), hsl(180 90% 50% / 0.15) 60%, transparent 70%)",
            border: "1px solid hsl(180 80% 70% / 0.3)",
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}

      {/* Subtle dark vignette to deepen the abyss feel */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, hsl(195 50% 4% / 0.6) 100%)",
        }}
      />
    </div>
  );
}
