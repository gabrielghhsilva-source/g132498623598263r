import { useRef, useState, useMemo } from "react";
import { FileUp, Upload, X, Check, TrendingUp, TrendingDown, PiggyBank, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
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

type Step = "investments" | "regular";

export function OfxImporter({ investmentAreas, onAddInvestment, onAddContribution, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("regular");
  const [stmt, setStmt] = useState<OfxStatement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [useBalance, setUseBalance] = useState(true);
  const [expensesOnly, setExpensesOnly] = useState(false);
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
      // Smart default: first existing investment if any, else first area as "new", else ignore.
      const firstInv = investmentAreas.flatMap(a => a.investments.map(i => ({ a, i })))[0];
      const firstArea = investmentAreas[0];
      const defaultAssign: Assignment = firstInv
        ? `${firstInv.a.id}:${firstInv.i.id}`
        : firstArea
        ? `new:${firstArea.id}`
        : "ignore";
      parsed.transactions.forEach(t => {
        sel[t.id] = true;
        if (t.isInvestment) {
          assign[t.id] = defaultAssign;
          names[t.id] = t.party || "Investimento";
        }
      });
      setSelected(sel);
      setAssignment(assign);
      setNewName(names);
      const hasInv = parsed.transactions.some(t => t.isInvestment);
      setStep(hasInv ? "investments" : "regular");
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

    const newlyCreated: Record<string, string> = {};

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

      if (t.amount >= 0) {
        if (expensesOnly) continue;
        incomes.push({ name: label, amount: t.amount });
      } else expenses.push({ name: label, amount: Math.abs(t.amount) });
    }

    onImport({
      setBalance: useBalance && stmt.balance !== null,
      balance: stmt.balance ?? 0,
      incomes,
      expenses,
    });
    close();
  };

  // Bulk apply same assignment to all investment transactions
  const applyToAll = (a: Assignment) => {
    setAssignment(s => {
      const next = { ...s };
      investmentTxns.forEach(t => { next[t.id] = a; });
      return next;
    });
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
            {/* Header with step indicator */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                {step === "investments" ? (
                  <PiggyBank className="w-5 h-5 text-amber-600 flex-shrink-0" />
                ) : (
                  <Upload className="w-5 h-5 text-primary flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="font-bold truncate">
                    {step === "investments" ? "Aplicações detectadas" : "Importar transações"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {investmentTxns.length > 0 && (
                      <>
                        Passo {step === "investments" ? 1 : 2} de 2
                        {" · "}
                      </>
                    )}
                    {step === "investments"
                      ? `${investmentTxns.length} possível(is) aplicação(ões)`
                      : `${regularTxns.length} transação(ões)`}
                  </p>
                </div>
              </div>
              <button onClick={close} className="p-1.5 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: Investments */}
            {step === "investments" && (
              <>
                <div className="px-5 py-3 border-b border-border bg-amber-500/5">
                  <p className="text-xs text-muted-foreground">
                    Achamos transações que parecem aplicações. Diga para onde cada uma vai — atribua a um investimento existente, crie um novo, ou ignore para tratar como despesa normal.
                  </p>
                  {investmentAreas.length === 0 ? (
                    <p className="text-[11px] text-destructive mt-2 italic">
                      Você ainda não tem áreas de investimento. Crie uma na aba Investimentos para poder atribuir aplicações.
                    </p>
                  ) : (
                    investmentTxns.length > 1 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Aplicar a todas:
                        </span>
                        <select
                          onChange={e => { if (e.target.value) applyToAll(e.target.value); e.currentTarget.selectedIndex = 0; }}
                          className="text-[11px] bg-muted rounded-md px-2 py-1 border border-border outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled>Escolher destino…</option>
                          <option value="ignore">Ignorar todas</option>
                          {investmentAreas.flatMap(area =>
                            area.investments.map(inv => (
                              <option key={`all:${area.id}:${inv.id}`} value={`${area.id}:${inv.id}`}>
                                Todas → {area.name} › {inv.name}
                              </option>
                            ))
                          )}
                          {investmentAreas.map(area => (
                            <option key={`all-new:${area.id}`} value={`new:${area.id}`}>
                              Todas → + Novo em {area.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                  {investmentTxns.map(t => {
                    const a = assignment[t.id] || "ignore";
                    const isNew = a.startsWith("new:");
                    const isIgnored = a === "ignore";
                    return (
                      <div
                        key={t.id}
                        className={`border rounded-lg px-3 py-2.5 space-y-2 transition-colors ${
                          isIgnored
                            ? "border-border bg-muted/30 opacity-70"
                            : "border-amber-500/30 bg-amber-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!selected[t.id]}
                            onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))}
                            className="accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.party || t.memo}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {fmtDateBR(t.date)} · {t.memo}
                            </p>
                          </div>
                          <span className={`text-sm font-bold tabular-nums ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                            {t.amount >= 0 ? "+" : "-"}{fmt(Math.abs(t.amount))}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-7">
                          <select
                            value={a}
                            onChange={e => setAssignment(s => ({ ...s, [t.id]: e.target.value }))}
                            className="text-xs bg-background rounded-md px-2 py-1.5 border border-border outline-none focus:ring-2 focus:ring-primary/40"
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
                              className="flex-1 min-w-[140px] text-xs bg-background rounded-md px-2 py-1.5 border border-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    {totals.countInv} aplicação(ões) · <span className="font-semibold text-amber-600">{fmt(totals.invest)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={close}
                      className="px-3 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setStep("regular")}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Regular transactions */}
            {step === "regular" && (
              <>
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
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={expensesOnly}
                      onChange={e => {
                        const on = e.target.checked;
                        setExpensesOnly(on);
                        if (on && stmt) {
                          setSelected(s => {
                            const next = { ...s };
                            for (const t of stmt.transactions) {
                              if (!t.isInvestment && t.amount >= 0) next[t.id] = false;
                            }
                            return next;
                          });
                        }
                      }}
                      className="accent-primary"
                    />
                    Importar apenas saídas/dívidas (ignora entradas, ex.: transferências para mim mesmo)
                  </label>
                </div>

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

                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
                  {investmentTxns.length > 0 ? (
                    <button
                      onClick={() => setStep("investments")}
                      className="px-3 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={close}
                      className="px-3 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground"
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
