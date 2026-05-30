import { useRef, useState, useMemo } from "react";
import { FileUp, Upload, X, Check, TrendingUp, TrendingDown, PiggyBank, Plus } from "lucide-react";
import { parseOFX, OfxTransaction, OfxStatement } from "@/lib/ofxParser";
import { InvestmentArea, Investment } from "@/lib/types";

// Assignment for a transaction detected (or marked) as investment.
// - "ignore"       → treat as normal income/expense
// - "<areaId>:<invId>" → add as contribution to existing investment
// - "new:<areaId>" → create new investment in this area
type Assignment = string;

interface Props {
  investmentAreas: InvestmentArea[];
  onAddInvestment: (areaId: string, inv: Omit<Investment, "id" | "contributions">) => string;
  onAddContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
  onImport: (data: {
    setBalance: boolean;
    balance: number;
    incomes: { name: string; amount: number }[];
    expenses: { name: string; amount: number }[];
  }) => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDateBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Label format: (date) (amount) (party). */
function buildLabel(t: OfxTransaction): string {
  const date = fmtDateBR(t.date);
  const amount = fmt(Math.abs(t.amount));
  const party = t.party || t.memo || (t.amount >= 0 ? "Crédito" : "Débito");
  return `${date} ${amount} ${party}`.slice(0, 90);
}

export function OfxImporter({ investmentAreas, onAddInvestment, onAddContribution, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stmt, setStmt] = useState<OfxStatement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [useBalance, setUseBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-txn investment assignment (only for txns user wants to treat as investments)
  const [assignment, setAssignment] = useState<Record<string, Assignment>>({});
  // For "new investment" rows: the name to use
  const [newName, setNewName] = useState<Record<string, string>>({});

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseOFX(text);
      if (parsed.transactions.length === 0 && parsed.balance === null) {
        setError("Nenhuma transação encontrada no arquivo OFX.");
        return;
      }
      setStmt(parsed);
      const sel: Record<string, boolean> = {};
      const assign: Record<string, Assignment> = {};
      const names: Record<string, string> = {};
      parsed.transactions.forEach(t => {
        sel[t.id] = true;
        if (t.isInvestment) {
          assign[t.id] = "ignore"; // user picks below
          names[t.id] = t.party || "Investimento";
        }
      });
      setSelected(sel);
      setAssignment(assign);
      setNewName(names);
      setOpen(true);
    } catch {
      setError("Falha ao ler o arquivo. Verifique se é um OFX válido.");
    }
  };

  const investmentTxns = useMemo(
    () => (stmt?.transactions ?? []).filter(t => t.isInvestment),
    [stmt]
  );
  const regularTxns = useMemo(
    () => (stmt?.transactions ?? []).filter(t => !t.isInvestment),
    [stmt]
  );

  const totals = useMemo(() => {
    if (!stmt) return { income: 0, expense: 0, countIn: 0, countOut: 0, invest: 0, countInv: 0 };
    let income = 0, expense = 0, countIn = 0, countOut = 0, invest = 0, countInv = 0;
    for (const t of stmt.transactions) {
      if (!selected[t.id]) continue;
      const a = assignment[t.id];
      const goesToInvestment = t.isInvestment && a && a !== "ignore";
      if (goesToInvestment) {
        invest += Math.abs(t.amount); countInv++;
        continue;
      }
      if (t.amount >= 0) { income += t.amount; countIn++; }
      else { expense += Math.abs(t.amount); countOut++; }
    }
    return { income, expense, countIn, countOut, invest, countInv };
  }, [stmt, selected, assignment]);

  const close = () => {
    setOpen(false);
    setStmt(null);
    setSelected({});
    setAssignment({});
    setNewName({});
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirm = () => {
    if (!stmt) return;
    const incomes: { name: string; amount: number }[] = [];
    const expenses: { name: string; amount: number }[] = [];

    // Cache of newly created investments per area to reuse if user assigned multiple txns
    // to the same "new:<areaId>" with same name.
    const newlyCreated: Record<string, string> = {}; // key `${areaId}|${name}` → invId

    for (const t of stmt.transactions) {
      if (!selected[t.id]) continue;
      const a = assignment[t.id];
      const label = buildLabel(t);

      if (t.isInvestment && a && a !== "ignore") {
        const dateIso = t.date || new Date().toISOString().split("T")[0];
        const amount = Math.abs(t.amount);
        if (a.startsWith("new:")) {
          const areaId = a.slice(4);
          const name = (newName[t.id] || t.party || "Investimento").trim() || "Investimento";
          const key = `${areaId}|${name.toLowerCase()}`;
          let invId = newlyCreated[key];
          if (!invId) {
            invId = onAddInvestment(areaId, {
              name,
              initialValue: 0,
              previouslyInvested: amount,
              monthlyContribution: 0,
              rateOfReturn: 0,
              rateType: "monthly",
              passiveIncome: 0,
              startDate: dateIso,
            });
            newlyCreated[key] = invId;
          } else {
            onAddContribution(areaId, invId, dateIso, amount);
          }
        } else {
          const [areaId, invId] = a.split(":");
          if (areaId && invId) onAddContribution(areaId, invId, dateIso, amount);
        }
        continue;
      }

      if (t.amount >= 0) incomes.push({ name: label, amount: t.amount });
      else expenses.push({ name: label, amount: Math.abs(t.amount) });
    }

    onImport({
      setBalance: useBalance && stmt.balance !== null,
      balance: stmt.balance ?? 0,
      incomes,
      expenses,
    });
    close();
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".ofx,.OFX,application/x-ofx,text/plain"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold border border-primary/20"
      >
        <FileUp className="w-4 h-4" />
        Importar extrato OFX
      </button>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      {open && stmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h2 className="font-bold">Importar extrato OFX</h2>
              </div>
              <button onClick={close} className="p-1.5 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="px-5 py-4 border-b border-border space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-success/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-success/80">Entradas ({totals.countIn})</div>
                  <p className="text-sm font-bold text-success tabular-nums">+{fmt(totals.income)}</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-destructive/80">Saídas ({totals.countOut})</div>
                  <p className="text-sm font-bold text-destructive tabular-nums">-{fmt(totals.expense)}</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-amber-600">Investim. ({totals.countInv})</div>
                  <p className="text-sm font-bold text-amber-600 tabular-nums">{fmt(totals.invest)}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Saldo</div>
                  <p className="text-sm font-bold tabular-nums">
                    {stmt.balance !== null ? fmt(stmt.balance) : "—"}
                  </p>
                </div>
              </div>
              {/* Saldo do extrato é apenas informativo — o importador nunca altera o salário. */}
            </div>

            {/* Investments detected */}
            {investmentTxns.length > 0 && (
              <div className="px-5 py-3 border-b border-border bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold">Possíveis aplicações detectadas ({investmentTxns.length})</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Estas transações parecem ser movimentações de investimento. Atribua a um investimento existente, crie um novo, ou ignore para tratar como despesa/entrada normal.
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {investmentTxns.map(t => {
                    const a = assignment[t.id] || "ignore";
                    const isNew = a.startsWith("new:");
                    return (
                      <div key={t.id} className="bg-card border border-border rounded-md px-3 py-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selected[t.id]}
                            onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))}
                            className="accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{t.memo}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtDateBR(t.date)}</p>
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                            {t.amount >= 0 ? "+" : "-"}{fmt(Math.abs(t.amount))}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={a}
                            onChange={e => setAssignment(s => ({ ...s, [t.id]: e.target.value }))}
                            className="text-xs bg-muted rounded-md px-2 py-1 border border-border outline-none"
                          >
                            <option value="ignore">Ignorar (tratar como normal)</option>
                            {investmentAreas.length > 0 && (
                              <optgroup label="Adicionar a um investimento">
                                {investmentAreas.flatMap(area =>
                                  area.investments.map(inv => (
                                    <option key={`${area.id}:${inv.id}`} value={`${area.id}:${inv.id}`}>
                                      {area.name} › {inv.name}
                                    </option>
                                  ))
                                )}
                              </optgroup>
                            )}
                            {investmentAreas.length > 0 && (
                              <optgroup label="Criar novo investimento em">
                                {investmentAreas.map(area => (
                                  <option key={`new:${area.id}`} value={`new:${area.id}`}>
                                    + Novo em {area.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {isNew && (
                            <input
                              value={newName[t.id] || ""}
                              onChange={e => setNewName(n => ({ ...n, [t.id]: e.target.value }))}
                              placeholder="Nome do investimento"
                              className="flex-1 min-w-[140px] text-xs bg-muted rounded-md px-2 py-1 border border-border outline-none placeholder:text-muted-foreground"
                            />
                          )}
                          {investmentAreas.length === 0 && (
                            <span className="text-[10px] text-muted-foreground italic">
                              Crie uma área de investimentos primeiro para poder atribuir.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular transactions list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted-foreground">{regularTxns.length} transações comuns</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelected(s => {
                        const next = { ...s };
                        regularTxns.forEach(t => { next[t.id] = true; });
                        return next;
                      });
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Selecionar todas
                  </button>
                  <button
                    onClick={() => {
                      setSelected(s => {
                        const next = { ...s };
                        regularTxns.forEach(t => { next[t.id] = false; });
                        return next;
                      });
                    }}
                    className="text-muted-foreground hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {regularTxns.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                      selected[t.id] ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[t.id]}
                      onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))}
                      className="accent-primary"
                    />
                    {t.amount >= 0
                      ? <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
                      : <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{buildLabel(t)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.memo}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                      {t.amount >= 0 ? "+" : "-"}{fmt(Math.abs(t.amount))}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button
                onClick={close}
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={totals.countIn + totals.countOut + totals.countInv === 0 && !(useBalance && stmt.balance !== null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Importar selecionadas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
