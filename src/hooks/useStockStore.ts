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

  useEffect(() => {
    secureSet("stock-portfolio", JSON.stringify(positions));
  }, [positions]);

  const addPosition = useCallback((symbol: string, shares: number, avgPrice: number) => {
    setPositions(prev => {
      const existing = prev.find(p => p.symbol === symbol);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.avgPrice * existing.shares + avgPrice * shares;
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
        avgPrice,
        purchaseDate: new Date().toISOString().split("T")[0],
      }];
    });
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  return { positions, addPosition, removePosition };
}
