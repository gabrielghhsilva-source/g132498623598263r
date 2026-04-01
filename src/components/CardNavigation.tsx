import { AppTab } from "@/lib/types";
import { ClipboardList, TrendingUp, BarChart3, Wallet, MousePointerClick } from "lucide-react";
import { useState } from "react";

const TABS: { id: AppTab; label: string; icon: typeof ClipboardList; color: string }[] = [
  { id: "tasks", label: "Tarefas", icon: ClipboardList, color: "hsl(var(--primary))" },
  { id: "investments", label: "Investimentos", icon: TrendingUp, color: "hsl(142, 71%, 45%)" },
  { id: "stocks", label: "Ações", icon: BarChart3, color: "hsl(217, 91%, 60%)" },
  { id: "salary", label: "Salário", icon: Wallet, color: "hsl(38, 92%, 50%)" },
  { id: "clicker", label: "Clicker", icon: MousePointerClick, color: "hsl(271, 91%, 65%)" },
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
      className="fixed left-1 top-1/2 -translate-y-1/2 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 100, height: 200, padding: "30px" }}
    >
      <div className="relative w-full h-full">
        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          const offset = i - activeIdx;

          let transform: string;
          if (hovered) {
            const fanY = offset * 28;
            const fanRotate = offset * 4;
            transform = `translateY(${fanY}px) rotate(${fanRotate}deg) scale(0.97)`;
          } else if (isActive) {
            transform = "translateY(0) rotate(0deg) scale(1)";
          } else {
            transform = `translateY(${offset * 6}px) rotate(${offset * 2}deg) scale(0.93)`;
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="absolute rounded-lg border-2 shadow-md transition-all ease-out flex flex-col items-center justify-center gap-1 cursor-pointer"
              style={{
                width: 50,
                height: 64,
                backgroundColor: "hsl(var(--card))",
                borderColor: isActive ? tab.color : "hsl(var(--border))",
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
                transform,
                opacity: isActive || hovered ? 1 : 0.7,
                top: "50%",
                left: "50%",
                marginTop: "-32px",
                marginLeft: "-25px",
                transitionDuration: "350ms",
              }}
              title={tab.label}
            >
              <tab.icon
                className="w-4.5 h-4.5 transition-colors"
                style={{ color: isActive ? tab.color : "hsl(var(--muted-foreground))", width: 18, height: 18 }}
              />
              <span
                className="font-semibold leading-none transition-colors"
                style={{ fontSize: 7, color: isActive ? tab.color : "hsl(var(--muted-foreground))" }}
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
