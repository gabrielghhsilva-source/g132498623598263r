import { ThemeId } from "@/lib/types";
import cthulhuImg from "@/assets/abyssal-cthulhu.jpg";
import seaweed1 from "@/assets/seaweed-1.png";
import seaweed2 from "@/assets/seaweed-2.png";
import galacticVideo from "@/assets/galactic-bg.mp4";
import planetPurple from "@/assets/planet-purple.png";
import moonLavender from "@/assets/moon-lavender.png";
import sepiaMap from "@/assets/sepia-map.jpg";
import sepiaCompass from "@/assets/sepia-compass.png";
import coralReefBg from "@/assets/coral-reef-bg.jpg";
import coralPetal1 from "@/assets/coral-petal-single-1.png";
import coralPetal2 from "@/assets/coral-petal-single-3.png";

interface Props {
  theme: ThemeId;
  enabled: boolean;
}

/**
 * Decorative theme-specific elements rendered behind content.
 * - Abissal (cyan): Cthulhu background + realistic seaweed at the bottom.
 * - Galáctico (lavender): full-bleed black hole video + floating planets.
 * - Sépia (beige): aged explorer map + slowly rotating compass rose.
 * - Coral (rose): tropical reef sunset + falling hibiscus petals + warm glow.
 */
export function ThemeDecorations({ theme, enabled }: Props) {
  if (!enabled) return null;
  if (theme === "cyan") return <AbyssalDecorations />;
  if (theme === "lavender") return <GalacticDecorations />;
  if (theme === "beige") return <SepiaDecorations />;
  if (theme === "rose") return <CoralDecorations />;
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

function CoralDecorations() {
  // Distribute petals across the screen with varied delays/durations/sizes
  // so the falling effect looks organic instead of mechanical. Single petals
  // (not full flowers) feel lighter and more atmospheric, like a real breeze.
  const petals = [
    { src: coralPetal1, left: "4%",  size: 32, delay: "0s",   dur: "22s", alt: false },
    { src: coralPetal2, left: "11%", size: 24, delay: "8s",   dur: "26s", alt: true  },
    { src: coralPetal1, left: "18%", size: 38, delay: "14s",  dur: "20s", alt: false },
    { src: coralPetal2, left: "26%", size: 28, delay: "4s",   dur: "24s", alt: true  },
    { src: coralPetal1, left: "33%", size: 22, delay: "11s",  dur: "19s", alt: false },
    { src: coralPetal2, left: "41%", size: 36, delay: "17s",  dur: "27s", alt: true  },
    { src: coralPetal1, left: "48%", size: 26, delay: "2s",   dur: "21s", alt: false },
    { src: coralPetal2, left: "56%", size: 34, delay: "9s",   dur: "25s", alt: true  },
    { src: coralPetal1, left: "63%", size: 28, delay: "15s",  dur: "23s", alt: false },
    { src: coralPetal2, left: "71%", size: 40, delay: "5s",   dur: "28s", alt: true  },
    { src: coralPetal1, left: "78%", size: 24, delay: "12s",  dur: "20s", alt: false },
    { src: coralPetal2, left: "85%", size: 32, delay: "19s",  dur: "26s", alt: true  },
    { src: coralPetal1, left: "92%", size: 28, delay: "7s",   dur: "22s", alt: false },
    { src: coralPetal2, left: "97%", size: 22, delay: "13s",  dur: "24s", alt: true  },
  ];

  return (
    <>
      {/* Full-bleed tropical reef sunset background */}
      <div
        className="fixed inset-0 -z-10 bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: `url(${coralReefBg})` }}
        aria-hidden
      />

      {/* Warm coral overlay so cards/text stay readable on the busy reef */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(350 70% 88% / 0.45) 0%, hsl(350 70% 88% / 0.25) 45%, hsl(15 60% 70% / 0.55) 100%)",
        }}
        aria-hidden
      />

      {/* Golden sunset glow pulsing softly at the bottom (water reflection) */}
      <div
        className="fixed inset-x-0 bottom-0 h-1/3 -z-[6] pointer-events-none animate-coral-glow"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, hsl(25 95% 70% / 0.55) 0%, hsl(15 80% 65% / 0.25) 40%, transparent 75%)",
        }}
        aria-hidden
      />

      {/* Falling hibiscus petals */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden" aria-hidden>
        {petals.map((p, i) => (
          <img
            key={i}
            src={p.src}
            alt=""
            loading="lazy"
            width={512}
            height={512}
            className={`absolute top-0 h-auto ${p.alt ? "animate-petal-fall-alt" : "animate-petal-fall"}`}
            style={{
              left: p.left,
              width: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.dur,
              filter: "drop-shadow(0 4px 8px hsl(350 60% 40% / 0.25))",
            }}
          />
        ))}
      </div>
    </>
  );
}

