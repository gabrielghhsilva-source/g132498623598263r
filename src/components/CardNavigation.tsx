import { AppTab } from "@/lib/types";
import { ClipboardList, TrendingUp } from "lucide-react";

const TABS: { id: AppTab; label: string; icon: typeof ClipboardList; color: string }[] = [
  { id: "tasks", label: "Tarefas", icon: ClipboardList, color: "hsl(var(--primary))" },
  { id: "investments", label: "Investimentos", icon: TrendingUp, color: "hsl(142, 71%, 45%)" },
];

interface Props {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function CardNavigation({ active, onChange }: Props) {
  const activeIdx = TABS.findIndex(t => t.id === active);

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 group/nav">
      <div className="relative w-14 h-20">
        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          const offset = i - activeIdx;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="absolute inset-0 w-14 rounded-xl border-2 shadow-lg transition-all duration-500 ease-out flex flex-col items-center justify-center gap-1 cursor-pointer"
              style={{
                backgroundColor: "hsl(var(--card))",
                borderColor: isActive ? tab.color : "hsl(var(--border))",
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
                // Stack: behind cards peek slightly
                transform: isActive
                  ? "translateY(0) rotate(0deg) scale(1)"
                  : `translateY(${offset * 8}px) rotate(${offset * 4}deg) scale(0.92)`,
                opacity: isActive ? 1 : 0.7,
                // Fan on group hover
              }}
              title={tab.label}
            >
              <tab.icon
                className="w-5 h-5 transition-colors"
                style={{ color: isActive ? tab.color : "hsl(var(--muted-foreground))" }}
              />
              <span
                className="text-[8px] font-semibold leading-none transition-colors"
                style={{ color: isActive ? tab.color : "hsl(var(--muted-foreground))" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fan-out style applied via CSS class */}
      <style>{`
        .group\\/nav:hover button {
          opacity: 1 !important;
        }
        .group\\/nav:hover button:nth-child(1) {
          transform: translateY(-30px) rotate(-6deg) scale(0.95) !important;
        }
        .group\\/nav:hover button:nth-child(2) {
          transform: translateY(30px) rotate(6deg) scale(0.95) !important;
        }
        .group\\/nav:hover button:hover {
          transform: translateY(0) rotate(0deg) scale(1.08) !important;
          z-index: 30 !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
        }
      `}</style>
    </div>
  );
}
