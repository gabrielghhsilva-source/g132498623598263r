import { useState } from "react";
import { Investment, InvestmentSourceConfig, InvestmentDataSource } from "@/lib/types";
import { TesouroTitulo, MarketRates, deriveRateFromSource, fetchStockQuote } from "@/lib/quotesApi";
import { Link2, X, RefreshCw } from "lucide-react";

interface Props {
  investment: Investment;
  rates: MarketRates | null;
  tesouro: TesouroTitulo[];
  onClose: () => void;
  onSave: (patch: Partial<Investment>) => void;
}

const SOURCE_LABELS: Record<InvestmentDataSource, string> = {
  manual: "Manual (taxa fixa)",
  cdi: "% do CDI",
  selic: "Selic + spread",
  ipca: "IPCA + spread",
  tesouro: "Tesouro Direto",
  stock: "Ação / FII (preço × cotas)",
};

export function LinkSourceDialog({ investment, rates, tesouro, onClose, onSave }: Props) {
  const cur = investment.source;
  const [type, setType] = useState<InvestmentDataSource>(cur?.type ?? "cdi");
  const [multiplier, setMultiplier] = useState(String(cur?.multiplier ?? 1));
  const [spread, setSpread] = useState(String(cur?.spread ?? 0));
  const [tesouroCode, setTesouroCode] = useState(cur?.tesouroCode ?? "");
  const [stockSymbol, setStockSymbol] = useState(cur?.stockSymbol ?? "");
  const [stockShares, setStockShares] = useState(String(cur?.stockShares ?? 0));
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (type === "manual") {
      onSave({ source: undefined });
      onClose();
      return;
    }
    setBusy(true);
    const source: InvestmentSourceConfig = {
      type,
      multiplier: type === "cdi" ? Number(multiplier) || 1 : undefined,
      spread: type === "selic" || type === "ipca" ? Number(spread) || 0 : undefined,
      tesouroCode: type === "tesouro" ? tesouroCode : undefined,
      stockSymbol: type === "stock" ? stockSymbol.trim().toUpperCase() : undefined,
      stockShares: type === "stock" ? Number(stockShares) || 0 : undefined,
    };

    const patch: Partial<Investment> = { source, lastQuoteAt: new Date().toISOString() };

    if (type === "stock") {
      const price = source.stockSymbol ? await fetchStockQuote(source.stockSymbol) : null;
      if (price != null) patch.manualCurrentValue = price * (source.stockShares ?? 0);
    } else if (rates) {
      const derived = deriveRateFromSource(source, rates, tesouro);
      if (derived) {
        patch.rateOfReturn = Math.round(derived.rateOfReturn * 100) / 100;
        patch.rateType = derived.rateType;
      }
      patch.manualCurrentValue = undefined;
    }

    onSave(patch);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Vincular a fonte externa</h3>
            <p className="text-xs text-muted-foreground">{investment.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-xs text-muted-foreground">Fonte de rendimento</label>
            <select value={type} onChange={e => setType(e.target.value as InvestmentDataSource)}
              className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none">
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {type === "cdi" && (
            <div>
              <label className="text-xs text-muted-foreground">Percentual do CDI (ex: 1.10 = 110%)</label>
              <input type="number" step="0.01" value={multiplier} onChange={e => setMultiplier(e.target.value)}
                className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none" />
              {rates?.cdiMonthly != null && (
                <p className="text-[11px] text-muted-foreground mt-1">CDI atual: {rates.cdiMonthly.toFixed(3)}% a.m. → taxa final {(rates.cdiMonthly * (Number(multiplier) || 1)).toFixed(3)}% a.m.</p>
              )}
            </div>
          )}

          {(type === "selic" || type === "ipca") && (
            <div>
              <label className="text-xs text-muted-foreground">Spread (% a.a.) sobre {type.toUpperCase()}</label>
              <input type="number" step="0.01" value={spread} onChange={e => setSpread(e.target.value)}
                className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none" />
              {type === "selic" && rates?.selicAnnual != null && (
                <p className="text-[11px] text-muted-foreground mt-1">Selic meta atual: {rates.selicAnnual.toFixed(2)}% a.a.</p>
              )}
              {type === "ipca" && rates?.ipcaMonthly != null && (
                <p className="text-[11px] text-muted-foreground mt-1">IPCA último mês: {rates.ipcaMonthly.toFixed(3)}% → ~{((Math.pow(1 + rates.ipcaMonthly / 100, 12) - 1) * 100).toFixed(2)}% a.a.</p>
              )}
            </div>
          )}

          {type === "tesouro" && (
            <div>
              <label className="text-xs text-muted-foreground">Título ({tesouro.length} disponíveis)</label>
              <select value={tesouroCode} onChange={e => setTesouroCode(e.target.value)}
                className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none">
                <option value="">— escolha um título —</option>
                {tesouro.map(t => (
                  <option key={t.code} value={t.code}>{t.code} — {t.annualRate.toFixed(2)}% a.a.</option>
                ))}
              </select>
            </div>
          )}

          {type === "stock" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Símbolo (ex: PETR4.SA, ITUB4.SA)</label>
                <input value={stockSymbol} onChange={e => setStockSymbol(e.target.value)}
                  className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cotas</label>
                <input type="number" step="0.0001" value={stockShares} onChange={e => setStockShares(e.target.value)}
                  className="w-full mt-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border outline-none" />
              </div>
              <p className="text-[11px] text-muted-foreground">A cotação será buscada via Alpha Vantage (limite de chamadas).</p>
            </div>
          )}

          {type === "manual" && (
            <p className="text-xs text-muted-foreground">Desvincula este investimento e volta a usar a taxa fixa que você definiu.</p>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={busy} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium disabled:opacity-50 flex items-center gap-1">
            {busy && <RefreshCw className="w-3 h-3 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
