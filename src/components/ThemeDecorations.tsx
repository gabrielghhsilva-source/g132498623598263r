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

      {/* Realistic seaweed anchored to the bottom of the screen */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        {/* Bottom-left — tall kelp strand rooted at floor */}
        <img
          src={seaweed1}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-8 -left-10 w-56 h-auto origin-bottom animate-seaweed-sway-soft"
          style={{
            filter: "drop-shadow(0 0 18px hsl(170 90% 30% / 0.45)) brightness(0.85) saturate(1.1)",
            opacity: 0.9,
          }}
        />

        {/* Bottom-center-left — bushy cluster */}
        <img
          src={seaweed2}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-12 left-1/4 w-72 h-auto origin-bottom animate-seaweed-sway-soft-alt"
          style={{
            filter: "drop-shadow(0 0 20px hsl(170 90% 30% / 0.5)) brightness(0.85) saturate(1.15)",
            opacity: 0.85,
          }}
        />

        {/* Bottom-right — tall kelp strand mirrored */}
        <img
          src={seaweed1}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-8 -right-10 w-60 h-auto origin-bottom animate-seaweed-sway-soft scale-x-[-1]"
          style={{
            filter: "drop-shadow(0 0 18px hsl(170 90% 30% / 0.45)) brightness(0.85) saturate(1.1)",
            opacity: 0.9,
          }}
        />
      </div>
    </>
  );
}
