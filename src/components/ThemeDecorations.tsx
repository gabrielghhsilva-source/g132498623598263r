import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * Abissal (cyan): full-bleed Cthulhu background image + green seaweed/leaves
 * tucked into the page corners (top-right, bottom-left, bottom-right).
 */
export function ThemeDecorations({ theme, enabled }: Props) {
  if (!enabled) return null;
  if (theme === "cyan") return <AbyssalDecorations />;
  return null;
}

function AbyssalDecorations() {
  return (
    <>
      {/* Full-bleed background image with subtle dark overlay for contrast */}
      <div
        className="fixed inset-0 -z-10 bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: `url(${cthulhuImg})` }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(195 50% 6% / 0.55) 0%, hsl(195 50% 6% / 0.25) 40%, hsl(195 50% 4% / 0.65) 100%)",
        }}
        aria-hidden
      />

      {/* Corner seaweed/leaf clusters */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        {/* Top-right cluster */}
        <div className="absolute top-16 right-0 w-48 h-64 origin-top-right animate-seaweed-sway">
          <LeafCluster variant="topRight" />
        </div>

        {/* Bottom-left cluster */}
        <div className="absolute bottom-0 left-0 w-56 h-72 origin-bottom-left animate-seaweed-sway-alt">
          <LeafCluster variant="bottomLeft" />
        </div>

        {/* Bottom-right cluster */}
        <div className="absolute bottom-0 right-0 w-56 h-72 origin-bottom-right animate-seaweed-sway">
          <LeafCluster variant="bottomRight" />
        </div>
      </div>
    </>
  );
}

/**
 * Stylized seaweed/leaf cluster — translucent green fronds with a subtle glow,
 * matching the deep-sea aesthetic of the reference mockup.
 */
function LeafCluster({ variant }: { variant: "topRight" | "bottomLeft" | "bottomRight" }) {
  const flip = variant === "bottomRight" || variant === "topRight";
  return (
    <svg
      viewBox="0 0 200 280"
      className="w-full h-full"
      style={{
        transform: flip ? "scaleX(-1)" : undefined,
        filter: "drop-shadow(0 0 12px hsl(160 80% 35% / 0.35))",
        opacity: 0.7,
      }}
    >
      <defs>
        <linearGradient id={`leaf-grad-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(150 65% 55%)" stopOpacity="0.85" />
          <stop offset="60%" stopColor="hsl(160 70% 38%)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="hsl(170 80% 22%)" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Several overlapping curved fronds emerging from the corner */}
      <path
        d="M180 280 Q150 200 165 130 Q175 80 140 30 Q120 10 100 0"
        fill={`url(#leaf-grad-${variant})`}
        stroke="hsl(160 70% 30%)"
        strokeWidth="1"
      />
      <path
        d="M195 280 Q180 220 190 160 Q200 110 185 60"
        fill={`url(#leaf-grad-${variant})`}
        opacity="0.75"
      />
      <path
        d="M160 280 Q130 210 140 140 Q150 90 115 50"
        fill={`url(#leaf-grad-${variant})`}
        opacity="0.65"
      />
      <path
        d="M140 280 Q110 220 100 160 Q90 110 70 80"
        fill={`url(#leaf-grad-${variant})`}
        opacity="0.55"
      />

      {/* A few small leaf accents */}
      <ellipse cx="155" cy="120" rx="8" ry="22" fill="hsl(150 70% 50%)" opacity="0.5" transform="rotate(-25 155 120)" />
      <ellipse cx="175" cy="180" rx="7" ry="18" fill="hsl(150 70% 50%)" opacity="0.5" transform="rotate(-15 175 180)" />
      <ellipse cx="125" cy="200" rx="9" ry="24" fill="hsl(150 70% 50%)" opacity="0.45" transform="rotate(-35 125 200)" />
    </svg>
  );
}
