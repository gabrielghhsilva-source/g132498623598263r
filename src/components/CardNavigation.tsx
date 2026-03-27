import { AppTab } from "@/lib/types";
import { ClipboardList, TrendingUp } from "lucide-react";
import { useState } from "react";

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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed left-3 top-1/2 -translate-y-1/2 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 80, height: 140, padding: "10px 0" }}
    >
      <div className="relative w-full h-full">
        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          const offset = i - activeIdx;

          let transform: string;
          if (hovered) {
            // Fan out
            const fanY = offset * 50;
            const fanRotate = offset * 6;
            transform = `translateY(${fanY}px) rotate(${fanRotate}deg) scale(0.97)`;
          } else if (isActive) {
            transform = "translateY(0) rotate(0deg) scale(1)";
          } else {
            transform = `translateY(${offset * 10}px) rotate(${offset * 4}deg) scale(0.93)`;
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="absolute inset-0 w-[70px] h-[90px] rounded-xl border-2 shadow-lg transition-all duration-400 ease-out flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:!scale-110 hover:!rotate-0 hover:!shadow-xl"
              style={{
                backgroundColor: "hsl(var(--card))",
                borderColor: isActive ? tab.color : "hsl(var(--border))",
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
                transform,
                opacity: isActive || hovered ? 1 : 0.7,
                top: "50%",
                left: "50%",
                marginTop: "-45px",
                marginLeft: "-35px",
                transitionDuration: "400ms",
              }}
              title={tab.label}
            >
              <tab.icon
                className="w-6 h-6 transition-colors"
                style={{ color: isActive ? tab.color : "hsl(var(--muted-foreground))" }}
              />
              <span
                className="text-[9px] font-semibold leading-none transition-colors"
                style={{ color: isActive ? tab.color : "hsl(var(--muted-foreground))" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
