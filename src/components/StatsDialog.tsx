import { useMemo } from "react";
import { TaskArea, PRIORITY_META, TaskTag } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Trophy, CalendarDays, Activity } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  areas: TaskArea[];
  tags: TaskTag[];
  timezone: string;
}

const WEEKS = 12;

function ymd(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}

/**
 * Dialog de estatísticas avançadas: heatmap de produtividade,
 * streak atual e tops por área/tag/prioridade. Tudo derivado de `completedAt`.
 */
export function StatsDialog({ open, onOpenChange, areas, tags }: Props) {
  const allTasks = useMemo(
    () => areas.flatMap(a => a.tasks.map(t => ({ ...t, areaId: a.id, areaName: a.name, areaIcon: a.icon }))),
    [areas]
  );

  const completed = useMemo(
    () => allTasks.filter(t => t.status === "done" && t.completedAt),
    [allTasks]
  );

  // Heatmap (últimas N semanas, começando na segunda-feira)
  const heatmap = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // 0=seg
    const start = addDays(today, -(WEEKS * 7 - 1 - (6 - dow)));
    const map = new Map<string, number>();
    for (const t of completed) {
      const key = (t.completedAt || "").split("T")[0];
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
    const days: { date: string; count: number; isFuture: boolean }[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = addDays(start, i);
      const key = ymd(d);
      days.push({ date: key, count: map.get(key) || 0, isFuture: d > today });
    }
    const max = Math.max(1, ...days.map(d => d.count));
    return { days, max };
  }, [completed]);

  // Streak (dias consecutivos com pelo menos 1 conclusão, terminando hoje ou ontem)
  const streak = useMemo(() => {
    const set = new Set(completed.map(t => (t.completedAt || "").split("T")[0]));
    let s = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let cursor = new Date(today);
    if (!set.has(ymd(cursor))) cursor = addDays(cursor, -1);
    while (set.has(ymd(cursor))) { s++; cursor = addDays(cursor, -1); }
    return s;
  }, [completed]);

  const last7Total = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cutoff = addDays(today, -6);
    return completed.filter(t => {
      const d = (t.completedAt || "").split("T")[0];
      return d >= ymd(cutoff);
    }).length;
  }, [completed]);

  const byArea = useMemo(() => {
    const counts = new Map<string, { name: string; icon: string; n: number }>();
    for (const t of completed) {
      const prev = counts.get(t.areaId) || { name: t.areaName, icon: t.areaIcon, n: 0 };
      prev.n++; counts.set(t.areaId, prev);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  }, [completed]);

  const byTag = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of completed) (t.tagIds || []).forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    return [...counts.entries()]
      .map(([id, n]) => ({ tag: tags.find(t => t.id === id), n }))
      .filter(x => x.tag)
      .sort((a, b) => b.n - a.n).slice(0, 5);
  }, [completed, tags]);

  const byPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of completed) {
      const p = t.priority || "none";
      counts[p] = (counts[p] || 0) + 1;
    }
    return (Object.keys(PRIORITY_META) as (keyof typeof PRIORITY_META)[])
      .map(p => ({ p, n: counts[p] || 0 }))
      .filter(x => x.n > 0);
  }, [completed]);

  const totalCompleted = completed.length;

  // Cor da célula do heatmap por intensidade
  const cellColor = (count: number) => {
    if (count === 0) return "bg-muted/40";
    const pct = count / heatmap.max;
    if (pct < 0.25) return "bg-success/25";
    if (pct < 0.5) return "bg-success/50";
    if (pct < 0.75) return "bg-success/70";
    return "bg-success";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Estatísticas
          </DialogTitle>
        </DialogHeader>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Flame className="w-4 h-4 text-orange-500" />} label="Streak" value={`${streak} d`} />
          <StatCard icon={<CalendarDays className="w-4 h-4 text-info" />} label="Últ. 7 dias" value={String(last7Total)} />
          <StatCard icon={<Trophy className="w-4 h-4 text-success" />} label="Total" value={String(totalCompleted)} />
        </div>

        {/* Heatmap */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Produtividade · últimas {WEEKS} semanas
          </p>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
            {heatmap.days.map(d => (
              <div
                key={d.date}
                title={`${d.date} · ${d.count} feita${d.count === 1 ? "" : "s"}`}
                className={`w-3 h-3 rounded-sm ${d.isFuture ? "bg-muted/20" : cellColor(d.count)}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            menos
            <span className="w-2.5 h-2.5 rounded-sm bg-muted/40" />
            <span className="w-2.5 h-2.5 rounded-sm bg-success/25" />
            <span className="w-2.5 h-2.5 rounded-sm bg-success/50" />
            <span className="w-2.5 h-2.5 rounded-sm bg-success/70" />
            <span className="w-2.5 h-2.5 rounded-sm bg-success" />
            mais
          </div>
        </div>

        {/* Tops */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <TopList title="Por área" items={byArea.map(a => ({ label: `${a.icon} ${a.name}`, n: a.n }))} empty="Sem dados" />
          <TopList
            title="Por tag"
            items={byTag.map(t => ({ label: t.tag!.name, n: t.n, color: t.tag!.color }))}
            empty="Sem dados"
          />
          <TopList
            title="Por prioridade"
            items={byPriority.map(({ p, n }) => ({ label: PRIORITY_META[p].label, n, color: PRIORITY_META[p].color }))}
            empty="Sem dados"
          />
        </div>

        {totalCompleted === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Conclua tarefas pra começar a ver suas estatísticas aqui.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl px-3 py-3 flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function TopList({ title, items, empty }: { title: string; items: { label: string; n: number; color?: string }[]; empty: string }) {
  const max = Math.max(1, ...items.map(i => i.n));
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate flex items-center gap-1.5">
                  {it.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />}
                  {it.label}
                </span>
                <span className="tabular-nums text-muted-foreground">{it.n}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-primary/70" style={{ width: `${(it.n / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
