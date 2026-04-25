import { AppTab } from "@/lib/types";
import { ClipboardList, TrendingUp, BarChart3, Wallet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const TABS: { id: AppTab; label: string; icon: typeof ClipboardList; color: string }[] = [
  { id: "tasks", label: "Tarefas", icon: ClipboardList, color: "hsl(var(--primary))" },
  { id: "investments", label: "Investimentos", icon: TrendingUp, color: "hsl(142, 71%, 45%)" },
  { id: "stocks", label: "Ações", icon: BarChart3, color: "hsl(217, 91%, 60%)" },
  { id: "salary", label: "Salário", icon: Wallet, color: "hsl(38, 92%, 50%)" },
];

interface Props {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function CardNavigation({ active, onChange }: Props) {
  const activeIdx = TABS.findIndex(t => t.id === active);
  const [hovered, setHovered] = useState(false);
  const [tapOpen, setTapOpen] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  // On mobile, "open" state is controlled by tap (not hover) and closes when tapping outside
  useEffect(() => {
    if (!isMobile || !tapOpen) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTapOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isMobile, tapOpen]);

  // Effective expanded state: hover on desktop, tap on mobile
  const expanded = isMobile ? tapOpen : hovered;

  // Card sizing: larger touch targets on mobile (≥44px width)
  const cardW = isMobile ? 56 : 50;
  const cardH = isMobile ? 70 : 64;
  const containerW = isMobile ? 80 : 100;
  const containerH = isMobile ? 220 : 200;
  const fanSpacing = isMobile ? 32 : 28;
  const stackSpacing = isMobile ? 5 : 6;

  const handleCardClick = (tabId: AppTab) => {
    if (isMobile) {
      // First tap: open fan; second tap on a card: select it
      if (!tapOpen) {
        setTapOpen(true);
        return;
      }
      onChange(tabId);
      setTapOpen(false);
    } else {
      onChange(tabId);
    }
  };

  return (
    <div
      ref={ref}
      className="fixed left-1 top-1/2 -translate-y-1/2 z-50"
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{ width: containerW, height: containerH, padding: "30px" }}
    >
      <div className="relative w-full h-full">
        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          const offset = i - activeIdx;

          let transform: string;
          if (expanded) {
            const fanY = offset * fanSpacing;
            const fanRotate = offset * 4;
            transform = `translateY(${fanY}px) rotate(${fanRotate}deg) scale(0.97)`;
          } else if (isActive) {
            transform = "translateY(0) rotate(0deg) scale(1)";
          } else {
            transform = `translateY(${offset * stackSpacing}px) rotate(${offset * 2}deg) scale(0.93)`;
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleCardClick(tab.id)}
              className="absolute rounded-lg border-2 shadow-md transition-all ease-out flex flex-col items-center justify-center gap-1 cursor-pointer"
              style={{
                width: cardW,
                height: cardH,
                backgroundColor: "hsl(var(--card))",
                borderColor: isActive ? tab.color : "hsl(var(--border))",
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
                transform,
                opacity: isActive || expanded ? 1 : 0.7,
                top: "50%",
                left: "50%",
                marginTop: `-${cardH / 2}px`,
                marginLeft: `-${cardW / 2}px`,
                transitionDuration: "350ms",
                touchAction: "manipulation",
              }}
              title={tab.label}
              aria-label={tab.label}
            >
              <tab.icon
                className="transition-colors"
                style={{
                  color: isActive ? tab.color : "hsl(var(--muted-foreground))",
                  width: isMobile ? 22 : 18,
                  height: isMobile ? 22 : 18,
                }}
              />
              <span
                className="font-semibold leading-none transition-colors"
                style={{
                  fontSize: isMobile ? 8 : 7,
                  color: isActive ? tab.color : "hsl(var(--muted-foreground))",
                }}
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
