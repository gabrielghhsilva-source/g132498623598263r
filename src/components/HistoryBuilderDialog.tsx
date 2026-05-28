import { useState, useMemo, useEffect } from "react";
import { History, X, Wand2 } from "lucide-react";
import { Investment } from "@/lib/types";

interface Props {
  investment: Investment;
  onClose: () => void;
  onConfirm: (entries: { date: string; amount: number }[]) => void;
}

function monthsBetween(startIso: string): { ym: string; label: string; date: string }[] {
  const start = new Date(startIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return [];
  const now = new Date();
  const out: { ym: string; label: string; date: string }[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    // last day of month or today if current
    const last =
      y === now.getFullYear() && m === now.getMonth()
        ? now.getDate()
        : new Date(y, m + 1, 0).getDate();
    const date = `${ym}-${String(last).padStart(2, "0")}`;
    const label = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    out.push({ ym, label, date });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

export function HistoryBuilderDialog({ investment, onClose, onConfirm }: Props) {
  const months = useMemo(() => monthsBetween(investment.startDate), [investment.startDate]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState("");

  // Preload with monthlyContribution as suggestion
  useEffect(() => {
    if (investment.monthlyContribution > 0) {
      const v: Record<string, string> = {};
      months.forEach(mo => { v[mo.ym] = String(investment.monthlyContribution); });
      setValues(v);
    }
  }, [investment.monthlyContribution, months]);

  const total = useMemo(
    () => months.reduce((acc, mo) => acc + (Number(values[mo.ym]) || 0), 0),
    [months, values],
  );

  const applyToAll = () => {
    if (!bulk) return;
    const n = Number(bulk);
    if (!Number.isFinite(n)) return;
    const v: Record<string, string> = {};
    months.forEach(mo => { v[mo.ym] = String(n); });
    setValues(v);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (!text || !/[\t\n;,]/.test(text)) return;
    e.preventDefault();
    const rows = text.split(/\r?\n/).map(r => r.split(/\t|;|,/).map(c => c.trim()));
    const v: Record<string, string> = { ...values };
    months.forEach((mo, i) => {
      const row = rows[i];
      if (!row) return;
      const num = row[row.length - 1].replace(/[^\d.-]/g, "").replace(",", ".");
      if (num) v[mo.ym] = num;
    });
    setValues(v);
  };

  const confirm = () => {
    const entries = months
      .map(mo => ({ date: mo.date, amount: Number(values[mo.ym]) || 0 }))
      .filter(e => e.amount > 0);
    onConfirm(entries);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-sm">Preencher histórico</h2>
              <p className="text-[11px] text-muted-foreground">{investment.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-3 border-b border-border space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold mb-1">Aplicar valor em todos os meses</label>
              <input
                type="number"
                value={bulk}
                onChange={e => setBulk(e.target.value)}
                placeholder="ex: 200"
                className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border"
              />
            </div>
            <button
              onClick={applyToAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold border border-primary/20"
            >
              <Wand2 className="w-3 h-3" /> Aplicar
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Dica: você pode colar uma coluna de valores do Excel direto na lista abaixo.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3" onPaste={onPaste}>
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Defina uma data de início no investimento para usar o builder de histórico.
            </p>
          ) : (
            <div className="space-y-1">
              {months.map(mo => (
                <div key={mo.ym} className="flex items-center gap-3 px-3 py-1.5 rounded-md border border-border">
                  <span className="text-xs font-medium w-24 capitalize">{mo.label}</span>
                  <input
                    type="number"
                    value={values[mo.ym] || ""}
                    onChange={e => setValues(v => ({ ...v, [mo.ym]: e.target.value }))}
                    placeholder="0"
                    className="flex-1 bg-secondary/60 rounded px-2 py-1 text-xs border border-border outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">{new Date(mo.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-bold text-foreground">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {" · "}{months.filter(mo => Number(values[mo.ym]) > 0).length} meses
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-muted-foreground">Cancelar</button>
            <button
              onClick={confirm}
              disabled={total <= 0}
              className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-semibold"
            >
              Salvar aportes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
