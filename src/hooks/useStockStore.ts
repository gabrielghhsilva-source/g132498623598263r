import { useState, useCallback, useEffect } from "react";
import { StockPosition } from "@/lib/types";
import { secureGet, secureSet } from "@/lib/crypto";

export function useStockStore() {
  const [positions, setPositions] = useState<StockPosition[]>(() => {
    try {
      const stored = secureGet("stock-portfolio");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    try {
      const stored = secureGet("alpha-vantage-key");
      return stored ? JSON.parse(stored) : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    secureSet("stock-portfolio", JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    secureSet("alpha-vantage-key", JSON.stringify(apiKey));
  }, [apiKey]);

  const setApiKey = useCallback((key: string) => setApiKeyState(key), []);

  const buyStock = useCallback((symbol: string, shares: number, price: number) => {
    setPositions(prev => {
      const existing = prev.find(p => p.symbol === symbol);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.avgPrice * existing.shares + price * shares;
        return prev.map(p =>
          p.symbol === symbol
            ? { ...p, shares: totalShares, avgPrice: totalCost / totalShares }
            : p
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        symbol,
        shares,
        avgPrice: price,
        purchaseDate: new Date().toISOString().split("T")[0],
      }];
    });
  }, []);

  const sellStock = useCallback((symbol: string, shares: number) => {
    setPositions(prev => {
      const existing = prev.find(p => p.symbol === symbol);
      if (!existing) return prev;
      if (shares >= existing.shares) return prev.filter(p => p.symbol !== symbol);
      return prev.map(p =>
        p.symbol === symbol ? { ...p, shares: p.shares - shares } : p
      );
    });
  }, []);

  const deletePosition = useCallback((id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  return { positions, apiKey, setApiKey, buyStock, sellStock, deletePosition };
}
