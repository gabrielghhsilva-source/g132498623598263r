import { useState, useCallback, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, BarChart3, ArrowUpDown, Loader2 } from "lucide-react";
import { StockPosition } from "@/lib/types";
import { getQuote, getDailyHistory, StockQuote, DailyPrice } from "@/lib/stockApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const LOCAL_STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet (Google)" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "BA", name: "Boeing" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "PETR4.SAO", name: "Petrobras" },
  { symbol: "VALE3.SAO", name: "Vale" },
  { symbol: "ITUB4.SAO", name: "Itaú Unibanco" },
  { symbol: "BBDC4.SAO", name: "Bradesco" },
  { symbol: "ABEV3.SAO", name: "Ambev" },
];

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
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<DailyPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});

  // Filter local list — no API call
  const filteredStocks = useMemo(() => {
    if (!search.trim()) return LOCAL_STOCKS;
    const q = search.toLowerCase();
    return LOCAL_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
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
      setSearch(symbol);
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
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      {positions.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold">Meu Portfólio</h3>
            </div>
            <button onClick={refreshPortfolioQuotes} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Atualizar cotações">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Investido</p>
              <p className="text-lg font-bold">{formatUSD(totalInvested)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Valor Atual</p>
              <p className="text-lg font-bold">{formatUSD(totalCurrent)}</p>
            </div>
            <div className={`rounded-lg p-3 ${totalPnL >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
              <p className="text-xs text-muted-foreground mb-1">Lucro/Prejuízo</p>
              <p className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Browse */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Explorar Ações
        </h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar ações... (ex: AAPL, TSLA, PETR4)"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-muted border border-border outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {/* Stock Grid */}
        {initialLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando ações...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredQuotes.map(q => (
              <button
                key={q.symbol}
                onClick={() => handleSelectStock(q.symbol)}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-all hover:scale-[1.01] text-left group"
              >
                <div>
                  <span className="text-sm font-bold">{q.symbol}</span>
                  <p className="text-xs text-muted-foreground">{formatUSD(q.price)}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                  q.change >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                  {q.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {q.change >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                </div>
              </button>
            ))}
            {filteredQuotes.length === 0 && !initialLoading && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-6">Nenhuma ação encontrada</p>
            )}
          </div>
        )}

        {/* Selected stock detail */}
        {selectedQuote && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold">{selectedQuote.symbol}</h4>
                <p className="text-2xl font-bold">{formatUSD(selectedQuote.price)}</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                selectedQuote.change >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              }`}>
                {selectedQuote.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {selectedQuote.change >= 0 ? "+" : ""}{selectedQuote.changePercent.toFixed(2)}%
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs text-muted-foreground mb-4">
              <div><span className="block mb-0.5">Abertura</span><span className="font-semibold text-foreground">{formatUSD(selectedQuote.open)}</span></div>
              <div><span className="block mb-0.5">Máxima</span><span className="font-semibold text-green-500">{formatUSD(selectedQuote.high)}</span></div>
              <div><span className="block mb-0.5">Mínima</span><span className="font-semibold text-red-500">{formatUSD(selectedQuote.low)}</span></div>
              <div><span className="block mb-0.5">Volume</span><span className="font-semibold text-foreground">{selectedQuote.volume.toLocaleString()}</span></div>
            </div>

            {/* Chart */}
            {history.length > 0 && (
              <div className="h-44 mb-4">
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
                className="w-16 px-2 py-2 rounded-lg text-sm bg-muted border border-border outline-none text-center"
                placeholder="Qtd"
              />
              <div className="px-3 py-2 rounded-lg text-sm bg-muted/50 border border-border text-muted-foreground text-center min-w-[90px]">
                {formatUSD(selectedQuote.price)}
              </div>
              <div className="px-3 py-2 rounded-lg text-sm bg-muted/50 border border-border font-bold text-center min-w-[110px]">
                = {formatUSD(selectedQuote.price * addQty)}
              </div>
              <button
                onClick={() => {
                  onAdd(selectedQuote.symbol, addQty, selectedQuote.price);
                  setAddQty(1);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Positions */}
      {positions.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Minhas Posições
          </h3>
          <div className="space-y-2">
            {positions.map(pos => {
              const quote = liveQuotes[pos.symbol];
              const currentPrice = quote?.price ?? pos.avgPrice;
              const pnl = (currentPrice - pos.avgPrice) * pos.shares;
              const pnlPct = pos.avgPrice > 0 ? ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;

              return (
                <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 group hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{pos.symbol}</span>
                      <span className="text-xs text-muted-foreground">{pos.shares} ações</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      PM: {formatUSD(pos.avgPrice)} · Atual: {formatUSD(currentPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                      </p>
                      <p className={`text-xs ${pnl >= 0 ? "text-green-500/70" : "text-red-500/70"}`}>
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                      </p>
                    </div>
                    <button onClick={() => onRemove(pos.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
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
