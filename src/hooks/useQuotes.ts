import { useEffect, useState, useCallback } from "react";
import { fetchMarketRates, fetchTesouroTitulos, MarketRates, TesouroTitulo } from "@/lib/quotesApi";

const CACHE_KEY = "quotes-cache-v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas

interface QuotesCache {
  rates: MarketRates | null;
  tesouro: TesouroTitulo[];
  cachedAt: number;
}

function loadCache(): QuotesCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as QuotesCache) : null;
  } catch {
    return null;
  }
}

export function useQuotes() {
  const initial = loadCache();
  const [rates, setRates] = useState<MarketRates | null>(initial?.rates ?? null);
  const [tesouro, setTesouro] = useState<TesouroTitulo[]>(initial?.tesouro ?? []);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (force = false) => {
    const cached = loadCache();
    const fresh = cached && Date.now() - cached.cachedAt < CACHE_TTL_MS;
    if (fresh && !force) return;
    setLoading(true);
    try {
      const [r, t] = await Promise.all([fetchMarketRates(), fetchTesouroTitulos()]);
      setRates(r);
      setTesouro(t);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: r, tesouro: t, cachedAt: Date.now() } satisfies QuotesCache));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return { rates, tesouro, loading, refresh };
}
