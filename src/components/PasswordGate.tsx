import { useState, useCallback, useMemo, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { initSecurity } from "@/lib/crypto";

interface Props {
  onUnlocked: () => void;
}

const TRUSTED_KEY = "trusted-device-pwd";

export function PasswordGate({ onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);

  // Try to auto-unlock if this device is trusted
  useEffect(() => {
    const stored = localStorage.getItem(TRUSTED_KEY);
    if (!stored) {
      setAutoChecking(false);
      return;
    }
    (async () => {
      const ok = await initSecurity(stored);
      if (ok) {
        onUnlocked();
      } else {
        localStorage.removeItem(TRUSTED_KEY);
        setAutoChecking(false);
      }
    })();
  }, [onUnlocked]);

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map(() => ({
        startX: Math.random() * 100,
        startY: Math.random() * 100,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 5,
      })),
    []
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const success = await initSecurity(password);
    if (success) {
      if (trustDevice) {
        localStorage.setItem(TRUSTED_KEY, password);
      }
      onUnlocked();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setLoading(false);
  }, [password, trustDevice, onUnlocked]);

  if (autoChecking) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}
      />
    );
  }


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}
    >
      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true" style={{ isolation: "isolate" }}>
        {particles.map((particle, i) => {
          return (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: "#fff",
                left: `${particle.startX}%`,
                top: `${particle.startY}%`,
                animation: `particle-drift-${i % 4} ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                willChange: "transform, opacity",
              }}
            />
          );
        })}
      </div>

      <div
        className={`relative w-[360px] p-8 rounded-2xl border backdrop-blur-xl transition-transform ${shake ? "animate-shake" : ""}`}
        style={{
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Lock className="w-7 h-7" style={{ color: "rgba(255,255,255,0.7)" }} />
          </div>
        </div>

        <h2 className="text-center text-lg font-semibold mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>
          Acesso Protegido
        </h2>
        <p className="text-center text-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          Digite sua senha para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              className="w-full px-4 py-3 pr-10 rounded-lg text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: "rgba(255,255,255,0.9)",
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
            >
              {show ? <EyeOff className="w-4 h-4" style={{ color: "#fff" }} /> : <Eye className="w-4 h-4" style={{ color: "#fff" }} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "rgba(239,68,68,0.8)" }}>
              Senha incorreta. Tente novamente.
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: "rgba(255,255,255,0.6)" }}>
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={e => setTrustDevice(e.target.checked)}
              className="accent-white/80"
            />
            <span className="text-xs">Confiar neste computador (não pedir senha)</span>
          </label>


          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: loading ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.8)" }} />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Criptografia AES-256-GCM
          </span>
        </div>
      </div>

      <style>{`
        @keyframes particle-drift-0 {
          0%, 100% { transform: translate(0, 0); opacity: 0.15; }
          25% { transform: translate(20px, -30px); opacity: 0.3; }
          50% { transform: translate(-15px, -50px); opacity: 0.15; }
          75% { transform: translate(25px, -20px); opacity: 0.25; }
        }
        @keyframes particle-drift-1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          33% { transform: translate(-25px, 15px); opacity: 0.1; }
          66% { transform: translate(30px, -25px); opacity: 0.3; }
        }
        @keyframes particle-drift-2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.1; }
          50% { transform: translate(35px, 20px); opacity: 0.25; }
        }
        @keyframes particle-drift-3 {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          40% { transform: translate(-20px, -35px); opacity: 0.1; }
          80% { transform: translate(15px, 10px); opacity: 0.3; }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
