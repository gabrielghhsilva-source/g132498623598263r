import { supabase } from "@/integrations/supabase/client";
import { getAppPassword } from "@/lib/crypto";

// In-memory cache to reduce API calls
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): any | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

async function callProxy(body: Record<string, string>) {
  const pwd = getAppPassword();
  const { data, error } = await supabase.functions.invoke("stock-proxy", {
    body,
    headers: pwd ? { "x-app-password": pwd } : undefined,
  });
  if (error) throw new Error(error.message || "Proxy request failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
}

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];
  const cacheKey = `search-${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callProxy({ action: "search", keywords: query });

  const results: SearchResult[] = (data.bestMatches || []).map((m: any) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
    currency: m["8. currency"],
  }));

  setCache(cacheKey, results);
  return results;
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote-${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callProxy({ action: "quote", symbol });

  const q = data["Global Quote"];
  if (!q || !q["05. price"]) return null;

  const quote: StockQuote = {
    symbol: q["01. symbol"],
    price: parseFloat(q["05. price"]),
    change: parseFloat(q["09. change"]),
    changePercent: parseFloat(q["10. change percent"]?.replace("%", "") || "0"),
    volume: parseInt(q["06. volume"]),
    previousClose: parseFloat(q["08. previous close"]),
    open: parseFloat(q["02. open"]),
    high: parseFloat(q["03. high"]),
    low: parseFloat(q["04. low"]),
  };

  setCache(cacheKey, quote);
  return quote;
}

export async function getDailyHistory(symbol: string): Promise<DailyPrice[]> {
  const cacheKey = `daily-${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await callProxy({ action: "daily", symbol });

  const series = data["Time Series (Daily)"];
  if (!series) return [];

  const prices: DailyPrice[] = Object.entries(series)
    .slice(0, 30)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseInt(values["5. volume"]),
    }))
    .reverse();

  setCache(cacheKey, prices);
  return prices;
}
