import { useRef, useState, useMemo } from "react";
import { FileUp, Upload, X, Check, TrendingUp, TrendingDown } from "lucide-react";
import { parseOFX, OfxTransaction, OfxStatement } from "@/lib/ofxParser";

interface Props {
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

export function OfxImporter({ onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stmt, setStmt] = useState<OfxStatement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [useBalance, setUseBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Select all by default
      const sel: Record<string, boolean> = {};
      parsed.transactions.forEach(t => { sel[t.id] = true; });
      setSelected(sel);
      setOpen(true);
    } catch (e) {
      setError("Falha ao ler o arquivo. Verifique se é um OFX válido.");
    }
  };

  const totals = useMemo(() => {
    if (!stmt) return { income: 0, expense: 0, countIn: 0, countOut: 0 };
    let income = 0, expense = 0, countIn = 0, countOut = 0;
    for (const t of stmt.transactions) {
      if (!selected[t.id]) continue;
      if (t.amount >= 0) { income += t.amount; countIn++; }
      else { expense += Math.abs(t.amount); countOut++; }
    }
    return { income, expense, countIn, countOut };
  }, [stmt, selected]);

  const close = () => {
    setOpen(false);
    setStmt(null);
    setSelected({});
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirm = () => {
    if (!stmt) return;
    const incomes: { name: string; amount: number }[] = [];
    const expenses: { name: string; amount: number }[] = [];
    for (const t of stmt.transactions) {
      if (!selected[t.id]) continue;
      const label = `[OFX ${t.date}] ${t.memo}`.slice(0, 80);
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
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}

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
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-success/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-success/80">Entradas ({totals.countIn})</div>
                  <p className="text-sm font-bold text-success tabular-nums">+{fmt(totals.income)}</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-destructive/80">Saídas ({totals.countOut})</div>
                  <p className="text-sm font-bold text-destructive tabular-nums">-{fmt(totals.expense)}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Saldo na conta</div>
                  <p className="text-sm font-bold tabular-nums">
                    {stmt.balance !== null ? fmt(stmt.balance) : "—"}
                  </p>
                </div>
              </div>
              {stmt.balance !== null && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBalance}
                    onChange={e => setUseBalance(e.target.checked)}
                    className="accent-primary"
                  />
                  Usar o saldo do extrato como "Salário/Saldo atual" {stmt.balanceDate && `(em ${stmt.balanceDate})`}
                </label>
              )}
            </div>

            {/* Transactions list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-muted-foreground">{stmt.transactions.length} transações encontradas</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      stmt.transactions.forEach(t => { all[t.id] = true; });
                      setSelected(all);
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Selecionar todas
                  </button>
                  <button
                    onClick={() => setSelected({})}
                    className="text-muted-foreground hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {stmt.transactions.map(t => (
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
                      <p className="text-sm font-medium truncate">{t.memo}</p>
                      <p className="text-[11px] text-muted-foreground">{t.date}</p>
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
                disabled={totals.countIn + totals.countOut === 0 && !(useBalance && stmt.balance !== null)}
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
