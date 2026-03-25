import { CheckCircle2, Clock, AlertTriangle, ListTodo, Loader2 } from "lucide-react";

interface Props {
  stats: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
}

export function StatsBar({ stats }: Props) {
  const items = [
    { label: "Total", value: stats.total, icon: ListTodo, className: "text-foreground" },
    { label: "Feitas", value: stats.done, icon: CheckCircle2, className: "text-success" },
    { label: "Em progresso", value: stats.inProgress, icon: Loader2, className: "text-info" },
    { label: "A fazer", value: stats.todo, icon: Clock, className: "text-muted-foreground" },
    { label: "Atrasadas", value: stats.overdue, icon: AlertTriangle, className: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map(item => (
        <div key={item.label} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
          <item.icon className={`w-5 h-5 flex-shrink-0 ${item.className}`} />
          <div>
            <p className="text-2xl font-bold leading-none">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
