import { useState, useMemo } from "react";
import { Zap, X, Search } from "lucide-react";
import { InvestmentArea } from "@/lib/types";
import { ContributionAmountInput } from "./ContributionAmountInput";

interface Props {
  areas: InvestmentArea[];
  onAddContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
}

export function QuickContributionDialog({ areas, onAddContribution }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<{ areaId: string; invId: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const flat = useMemo(() => areas.flatMap(a => a.investments.map(i => ({ area: a, inv: i }))), [areas]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return flat;
    return flat.filter(({ area, inv }) =>
      inv.name.toLowerCase().includes(q) || area.name.toLowerCase().includes(q),
    );
  }, [flat, search]);

  const picked = pick ? flat.find(f => f.area.id === pick.areaId && f.inv.id === pick.invId) : null;

  const close = () => { setOpen(false); setPick(null); setAmount(""); setSearch(""); };

  const confirm = () => {
    if (!pick || !amount || Number(amount) <= 0) return;
    onAddContribution(pick.areaId, pick.invId, date, Number(amount));
    close();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={flat.length === 0}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold border border-primary/20"
        title="Aporte rápido"
      >
        <Zap className="w-4 h-4" /> Aporte rápido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-sm">Aporte rápido</h2>
              </div>
              <button onClick={close} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-3">
              {!picked ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar investimento..."
                      className="w-full bg-secondary/60 rounded-lg pl-9 pr-3 py-2 text-sm outline-none border border-border placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {filtered.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Nenhum investimento encontrado.</p>
                    )}
                    {filtered.map(({ area, inv }) => (
                      <button
                        key={inv.id}
                        onClick={() => setPick({ areaId: area.id, invId: inv.id })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/50 text-left"
                      >
                        <span>{area.logoEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{inv.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{area.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-2">
                    <span>{picked.area.logoEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{picked.inv.name}</p>
                      <p className="text-[11px] text-muted-foreground">{picked.area.name}</p>
                    </div>
                    <button onClick={() => setPick(null)} className="text-[11px] text-primary hover:underline">trocar</button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Valor</label>
                    <ContributionAmountInput
                      value={amount}
                      onChange={setAmount}
                      step={picked.inv.contributionStep}
                      quickAmounts={picked.inv.quickAmounts}
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <button onClick={close} className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-muted-foreground">Cancelar</button>
              <button
                onClick={confirm}
                disabled={!pick || !amount || Number(amount) <= 0}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-semibold"
              >
                Adicionar aporte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
