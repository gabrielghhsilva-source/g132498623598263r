import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";
import seaweed1 from "@/assets/seaweed-1.png";
import seaweed2 from "@/assets/seaweed-2.png";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * Abissal (cyan): full-bleed Cthulhu background image + realistic seaweed
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

      {/* Realistic seaweed in page corners */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        {/* Top-right — tall vertical kelp, hanging from above */}
        <img
          src={seaweed1}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -top-16 -right-12 w-64 h-auto rotate-180 origin-top-right animate-seaweed-sway"
          style={{
            filter: "drop-shadow(0 0 18px hsl(170 90% 30% / 0.45)) brightness(0.85) saturate(1.1)",
            opacity: 0.9,
          }}
        />

        {/* Bottom-left — bushy cluster rising from the floor */}
        <img
          src={seaweed2}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-10 -left-16 w-80 h-auto origin-bottom-left animate-seaweed-sway-alt"
          style={{
            filter: "drop-shadow(0 0 20px hsl(170 90% 30% / 0.5)) brightness(0.85) saturate(1.15)",
            opacity: 0.92,
          }}
        />

        {/* Bottom-right — tall kelp strand */}
        <img
          src={seaweed1}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-12 -right-10 w-72 h-auto origin-bottom-right animate-seaweed-sway scale-x-[-1]"
          style={{
            filter: "drop-shadow(0 0 18px hsl(170 90% 30% / 0.45)) brightness(0.85) saturate(1.1)",
            opacity: 0.9,
          }}
        />
      </div>
    </>
  );
}
