import { useState, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, BarChart3, ArrowUpDown } from "lucide-react";
import { StockPosition } from "@/lib/types";
import { searchSymbols, getQuote, getDailyHistory, StockQuote, SearchResult, DailyPrice } from "@/lib/stockApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  positions: StockPosition[];
  onAdd: (symbol: string, shares: number, price: number) => void;
  onRemove: (id: string) => void;
}

function formatUSD(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export function StockMarket({ positions, onAdd, onRemove }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<DailyPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});

  const handleSearch = useCallback(async () => {
    if (!search) return;
    setLoading(true);
    setError("");
    try {
      const r = await searchSymbols(search);
      setResults(r);
    } catch (e: any) {
      setError(e.message || "Erro na busca");
    }
    setLoading(false);
  }, [search]);

  const handleSelectStock = useCallback(async (symbol: string) => {
    setLoading(true);
    setError("");
    try {
      const [quote, daily] = await Promise.all([
        getQuote(symbol),
        getDailyHistory(symbol),
      ]);
      setSelectedQuote(quote);
      setHistory(daily);
      setResults([]);
      setSearch(symbol);
      if (quote) setAddPrice(quote.price.toFixed(2));
    } catch (e: any) {
      setError(e.message || "Erro ao carregar dados");
    }
    setLoading(false);
  }, []);

  const refreshPortfolioQuotes = useCallback(async () => {
    if (positions.length === 0) return;
    setLoading(true);
    const quotes: Record<string, StockQuote> = {};
    for (const pos of positions) {
      try {
        const q = await getQuote(pos.symbol);
        if (q) quotes[pos.symbol] = q;
      } catch { break; }
    }
    setLiveQuotes(quotes);
    setLoading(false);
  }, [positions]);

  const totalInvested = positions.reduce((s, p) => s + p.avgPrice * p.shares, 0);
  const totalCurrent = positions.reduce((s, p) => {
    const q = liveQuotes[p.symbol];
    return s + (q ? q.price * p.shares : p.avgPrice * p.shares);
  }, 0);
  const totalPnL = totalCurrent - totalInvested;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold">Acompanhamento de Ações</h3>
          </div>
          <button onClick={refreshPortfolioQuotes} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Atualizar cotações">
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {positions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Investido</p>
              <p className="text-sm font-bold">{formatUSD(totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Atual</p>
              <p className="text-sm font-bold">{formatUSD(totalCurrent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro/Prejuízo</p>
              <p className={`text-sm font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Buscar Ações
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Ex: AAPL, MSFT, PETR4.SAO..."
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-muted border border-border outline-none"
          />
          <button onClick={handleSearch} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
            Buscar
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map(r => (
              <button key={r.symbol} onClick={() => handleSelectStock(r.symbol)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left">
                <div>
                  <span className="text-sm font-semibold">{r.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{r.region} · {r.currency}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected stock */}
        {selectedQuote && (
          <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-base font-bold">{selectedQuote.symbol}</h4>
                <p className="text-2xl font-bold">{formatUSD(selectedQuote.price)}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${selectedQuote.change >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                {selectedQuote.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {selectedQuote.change >= 0 ? "+" : ""}{selectedQuote.changePercent.toFixed(2)}%
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-4">
              <div><span className="block">Abertura</span><span className="font-semibold text-foreground">{formatUSD(selectedQuote.open)}</span></div>
              <div><span className="block">Máxima</span><span className="font-semibold text-foreground">{formatUSD(selectedQuote.high)}</span></div>
              <div><span className="block">Mínima</span><span className="font-semibold text-foreground">{formatUSD(selectedQuote.low)}</span></div>
              <div><span className="block">Volume</span><span className="font-semibold text-foreground">{selectedQuote.volume.toLocaleString()}</span></div>
            </div>

            {/* Chart */}
            {history.length > 0 && (
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Add to portfolio */}
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 rounded-lg text-sm bg-muted border border-border outline-none text-center"
                placeholder="Qtd"
              />
              <input
                type="number" min={0} step={0.01} value={addPrice}
                onChange={e => setAddPrice(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg text-sm bg-muted border border-border outline-none text-center"
                placeholder="Preço médio"
              />
              <button
                onClick={() => {
                  const price = parseFloat(addPrice) || selectedQuote.price;
                  onAdd(selectedQuote.symbol, addQty, price);
                  setAddQty(1);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar ao portfólio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio */}
      {positions.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Minhas Posições
          </h3>
          <div className="space-y-2">
            {positions.map(pos => {
              const quote = liveQuotes[pos.symbol];
              const currentPrice = quote?.price ?? pos.avgPrice;
              const pnl = (currentPrice - pos.avgPrice) * pos.shares;
              const pnlPct = pos.avgPrice > 0 ? ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;

              return (
                <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{pos.symbol}</span>
                      <span className="text-xs text-muted-foreground">{pos.shares} ações</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Preço médio: {formatUSD(pos.avgPrice)} · Atual: {formatUSD(currentPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <p className={`text-sm font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{formatUSD(pnl)} ({pnlPct.toFixed(1)}%)
                      </p>
                    </div>
                    <button onClick={() => onRemove(pos.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Remover">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
