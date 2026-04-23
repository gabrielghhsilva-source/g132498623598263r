import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * For "cyan" (Abissal): faint Cthulhu silhouette + bubbles + anchors at bottom.
 * Seaweed border decorations are injected via a global CSS class on cards (handled in index.css).
 */
export function ThemeDecorations({ theme, enabled }: Props) {
  if (!enabled) return null;

  if (theme === "cyan") {
    return <AbyssalDecorations />;
  }

  return null;
}

function AbyssalDecorations() {
  // Bubbles — generated once with stable random props
  const bubbles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    size: 6 + ((i * 7) % 18),
    delay: (i * 1.3) % 12,
    duration: 14 + ((i * 3) % 12),
    opacity: 0.15 + ((i * 0.07) % 0.25),
  }));

  return (
    <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden">
      {/* Cthulhu silhouette — centered, very faint */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,900px)] h-[min(90vh,900px)] bg-no-repeat bg-center bg-contain animate-cthulhu-pulse mix-blend-screen"
        style={{
          backgroundImage: `url(${cthulhuImg})`,
          opacity: 0.18,
          filter: "blur(0.5px)",
        }}
      />

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

      {/* Anchors row at the very bottom */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-around items-end px-8 opacity-[0.18]">
        <AnchorSvg className="w-10 h-10 text-primary" />
        <AnchorSvg className="w-14 h-14 text-primary -translate-y-2" />
        <AnchorSvg className="w-8 h-8 text-primary" />
        <AnchorSvg className="w-12 h-12 text-primary -translate-y-1" />
        <AnchorSvg className="w-9 h-9 text-primary" />
        <AnchorSvg className="w-14 h-14 text-primary -translate-y-3" />
        <AnchorSvg className="w-10 h-10 text-primary" />
      </div>

      {/* Seaweed strands at the bottom edges */}
      <SeaweedSvg className="absolute bottom-0 left-2 w-24 h-48 opacity-[0.22] animate-seaweed-sway origin-bottom" />
      <SeaweedSvg className="absolute bottom-0 left-32 w-20 h-40 opacity-[0.18] animate-seaweed-sway-alt origin-bottom" />
      <SeaweedSvg className="absolute bottom-0 right-4 w-28 h-52 opacity-[0.22] animate-seaweed-sway origin-bottom scale-x-[-1]" />
      <SeaweedSvg className="absolute bottom-0 right-36 w-20 h-40 opacity-[0.18] animate-seaweed-sway-alt origin-bottom scale-x-[-1]" />
    </div>
  );
}

function AnchorSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="32" cy="10" r="4" />
      <line x1="32" y1="14" x2="32" y2="54" />
      <line x1="24" y1="22" x2="40" y2="22" />
      <path d="M14 40 Q14 54 32 54 Q50 54 50 40" />
      <line x1="10" y1="40" x2="18" y2="40" />
      <line x1="46" y1="40" x2="54" y2="40" />
    </svg>
  );
}

function SeaweedSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 200" fill="none" stroke="hsl(160 70% 45%)" strokeWidth="3" strokeLinecap="round" className={className}>
      <path d="M50 200 Q40 160 55 130 Q70 100 45 70 Q25 45 50 10" />
      <path d="M40 200 Q30 170 45 145 Q60 115 35 85 Q20 60 40 25" opacity="0.7" />
      <path d="M60 200 Q70 165 55 140 Q40 110 65 80 Q80 55 60 20" opacity="0.6" />
    </svg>
  );
}
