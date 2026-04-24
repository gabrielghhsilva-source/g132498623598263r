import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";
import seaweed1 from "@/assets/seaweed-1.png";
import seaweed2 from "@/assets/seaweed-2.png";
import galacticVideo from "@/assets/galactic-bg.mp4";
import planetPurple from "@/assets/planet-purple.png";
import moonLavender from "@/assets/moon-lavender.png";
import sepiaMap from "@/assets/sepia-map.jpg";
import sepiaCompass from "@/assets/sepia-compass.png";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * - Abissal (cyan): Cthulhu background + realistic seaweed at the bottom.
 * - Galáctico (lavender): full-bleed black hole video + floating planets.
 * - Sépia (beige): aged explorer map + slowly rotating compass rose.
 */
export function ThemeDecorations({ theme, enabled }: Props) {
  if (!enabled) return null;
  if (theme === "cyan") return <AbyssalDecorations />;
  if (theme === "lavender") return <GalacticDecorations />;
  if (theme === "beige") return <SepiaDecorations />;
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

function GalacticDecorations() {
  return (
    <>
      {/* Full-bleed black hole video. We use object-cover + a slight scale
          so the singularity doesn't dominate the screen and the starfield
          fills every edge — even on ultra-wide viewports. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 -z-10 w-full h-full object-cover scale-[1.35]"
        style={{ transformOrigin: "center" }}
        aria-hidden
      >
        <source src={galacticVideo} type="video/mp4" />
      </video>

      {/* Subtle vignette so UI text stays readable over the bright core */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(270 40% 4% / 0) 30%, hsl(270 40% 4% / 0.55) 100%)",
        }}
        aria-hidden
      />

      {/* Floating planets/moons */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        {/* Top-right ringed purple planet */}
        <img
          src={planetPurple}
          alt=""
          loading="lazy"
          width={512}
          height={512}
          className="absolute top-16 -right-10 w-44 h-auto animate-planet-float"
          style={{
            filter: "drop-shadow(0 0 24px hsl(280 90% 60% / 0.55))",
            opacity: 0.92,
          }}
        />

        {/* Bottom-left lavender moon — smaller, slower */}
        <img
          src={moonLavender}
          alt=""
          loading="lazy"
          width={512}
          height={512}
          className="absolute bottom-24 -left-8 w-32 h-auto animate-planet-float-alt"
          style={{
            filter: "drop-shadow(0 0 20px hsl(250 80% 70% / 0.5))",
            opacity: 0.88,
          }}
        />
      </div>
    </>
  );
}

function SepiaDecorations() {
  return (
    <>
      {/* Full-bleed aged map background */}
      <div
        className="fixed inset-0 -z-10 bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: `url(${sepiaMap})` }}
        aria-hidden
      />

      {/* Warm sepia overlay so cards/text stay readable on the busy map */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(36 40% 88% / 0.55) 0%, hsl(36 40% 88% / 0.35) 50%, hsl(28 35% 78% / 0.55) 100%)",
        }}
        aria-hidden
      />

      {/* Translucent compass rose slowly rotating in a corner */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        <img
          src={sepiaCompass}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute -bottom-16 -right-16 w-80 h-auto animate-compass-spin"
          style={{
            opacity: 0.18,
            filter: "sepia(0.6) saturate(1.2) brightness(0.85)",
          }}
        />
      </div>
    </>
  );
}

