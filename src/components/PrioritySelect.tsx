import { TaskPriority, PRIORITY_META } from "@/lib/types";
import { Flag } from "lucide-react";

interface Props {
  value: TaskPriority;
  onChange: (p: TaskPriority) => void;
  compact?: boolean;
}

const ORDER: TaskPriority[] = ["urgent", "high", "medium", "low", "none"];

export function PrioritySelect({ value, onChange, compact }: Props) {
  return (
    <div className="flex items-center gap-1">
      {ORDER.map(p => {
        const meta = PRIORITY_META[p];
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            title={meta.label}
            aria-label={`Prioridade ${meta.label}`}
            className={`flex items-center gap-1 rounded-md transition-all ${
              compact ? "px-1.5 py-1" : "px-2 py-1.5"
            } ${active ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"}`}
            style={{
              backgroundColor: active ? `${meta.color}20` : "transparent",
              color: meta.color,
              ...(active ? { boxShadow: `0 0 0 1px ${meta.color}` } : {}),
            }}
          >
            <Flag className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} fill={p === "none" ? "transparent" : meta.color} />
            {!compact && <span className="text-xs font-medium">{meta.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "none" || !priority) return null;
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
    >
      <Flag className="w-2.5 h-2.5" fill={meta.color} />
      {meta.label}
    </span>
  );
}
