import { useState, useEffect } from "react";

export function Preloader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"text" | "split" | "done">("text");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("split"), 2000);
    const t2 = setTimeout(() => {
      setPhase("done");
      onDone();
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Left half */}
      <div
        className={`w-1/2 h-full bg-white flex items-center justify-end transition-transform duration-700 ease-in-out ${
          phase === "split" ? "-translate-x-full" : ""
        }`}
      >
        <span
          className={`text-3xl sm:text-5xl font-bold text-neutral-900 tracking-tight pr-1 transition-opacity duration-500 ${
            phase === "split" ? "opacity-0" : "opacity-100"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          bem-
        </span>
      </div>
      {/* Right half */}
      <div
        className={`w-1/2 h-full bg-white flex items-center justify-start transition-transform duration-700 ease-in-out ${
          phase === "split" ? "translate-x-full" : ""
        }`}
      >
        <span
          className={`text-3xl sm:text-5xl font-bold text-neutral-900 tracking-tight pl-1 transition-opacity duration-500 ${
            phase === "split" ? "opacity-0" : "opacity-100"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          vindo
        </span>
      </div>
    </div>
  );
}
