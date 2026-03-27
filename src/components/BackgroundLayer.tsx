import { useEffect, useRef } from "react";
import { BackgroundSettings } from "@/lib/types";

interface Props {
  settings: BackgroundSettings;
}

export function BackgroundLayer({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Particles effect
  useEffect(() => {
    if (settings.mode !== "particles") {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < settings.particleCount; i++) {
      const speed = 0.3 + Math.random() * 0.7;
      let vx = 0, vy = 0;
      switch (settings.particleDirection) {
        case "up": vy = -speed; vx = (Math.random() - 0.5) * 0.3; break;
        case "down": vy = speed; vx = (Math.random() - 0.5) * 0.3; break;
        case "left": vx = -speed; vy = (Math.random() - 0.5) * 0.3; break;
        case "right": vx = speed; vy = (Math.random() - 0.5) * 0.3; break;
        case "random": vx = (Math.random() - 0.5) * speed * 2; vy = (Math.random() - 0.5) * speed * 2; break;
      }
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx, vy,
        size: 1 + Math.random() * 2.5,
        opacity: 0.2 + Math.random() * 0.6,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = settings.particleColor;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [settings.mode, settings.particleCount, settings.particleColor, settings.particleDirection]);

  if (settings.mode === "none") return null;

  if (settings.mode === "solid") {
    return (
      <div
        className="fixed inset-0 -z-10 transition-colors duration-500"
        style={{ backgroundColor: settings.solidColor }}
      />
    );
  }

  if (settings.mode === "gradient") {
    const gradient = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColors.join(", ")})`;
    return (
      <div
        className="fixed inset-0 -z-10 transition-all duration-500"
        style={{ background: gradient }}
      />
    );
  }

  if (settings.mode === "animated-gradient") {
    const colors = settings.gradientColors.join(", ");
    const duration = Math.max(1, 15 - settings.animationSpeed * 1.4);
    const size = 100 + settings.animationIntensity * 3;
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(${settings.gradientAngle}deg, ${colors})`,
          backgroundSize: `${size}% ${size}%`,
          animation: `gradientShift ${duration}s ease infinite`,
        }}
      />
    );
  }

  if (settings.mode === "particles") {
    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: settings.solidColor }}
      />
    );
  }

  if (settings.mode === "image" && settings.imageUrl) {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(settings.imageUrl);
    if (isVideo) {
      return (
        <video
          autoPlay loop muted playsInline
          className="fixed inset-0 -z-10 w-full h-full object-cover"
          src={settings.imageUrl}
        />
      );
    }
    return (
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${settings.imageUrl})` }}
      />
    );
  }

  return null;
}
