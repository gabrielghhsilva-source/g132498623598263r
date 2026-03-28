import { useState, useCallback } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { initSecurity } from "@/lib/crypto";

interface Props {
  onUnlocked: () => void;
}

export function PasswordGate({ onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const success = await initSecurity(password);
    if (success) {
      onUnlocked();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setLoading(false);
  }, [password, onUnlocked]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}
    >
      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => {
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          const duration = 4 + Math.random() * 6;
          const delay = Math.random() * 5;
          const driftX = -30 + Math.random() * 60;
          const driftY = -30 + Math.random() * 60;
          return (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-20"
              style={{
                backgroundColor: "#fff",
                left: `${startX}%`,
                top: `${startY}%`,
                animation: `particle-drift-${i % 4} ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                ["--drift-x" as any]: `${driftX}px`,
                ["--drift-y" as any]: `${driftY}px`,
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
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
