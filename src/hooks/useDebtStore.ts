import { useState, useCallback, useEffect } from "react";
import { DebtItem } from "@/lib/types";
import { secureGet, secureSet } from "@/lib/crypto";
import { loadCloudState, saveCloudState } from "@/lib/cloudSync";

const KEY = "debts-data";
const CLOUD_KEY = "debts";

function load(): DebtItem[] {
  try {
    const s = secureGet(KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function useDebtStore() {
  const [debts, setDebts] = useState<DebtItem[]>(() => load());

  // Hydrate from Lovable Cloud on mount
  useEffect(() => {
    let cancelled = false;
    loadCloudState<DebtItem[]>(CLOUD_KEY).then(cloud => {
      if (!cancelled && cloud) setDebts(cloud);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    secureSet(KEY, JSON.stringify(debts));
    saveCloudState(CLOUD_KEY, debts);
  }, [debts]);

  const addDebt = useCallback(
    (input: Omit<DebtItem, "id" | "createdAt" | "paid">) => {
      const debt: DebtItem = {
        ...input,
        id: crypto.randomUUID(),
        paid: false,
        createdAt: new Date().toISOString(),
      };
      setDebts(prev => [...prev, debt]);
    },
    [],
  );

  const togglePaid = useCallback((id: string) => {
    setDebts(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, paid: !d.paid, paidAt: !d.paid ? new Date().toISOString() : undefined }
          : d,
      ),
    );
  }, []);

  const updateDebt = useCallback((id: string, patch: Partial<DebtItem>) => {
    setDebts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
  }, []);

  // Derived
  const totalPending = debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalPaid = debts.filter(d => d.paid).reduce((s, d) => s + d.amount, 0);
  const overdue = debts.filter(d => {
    if (d.paid || !d.dueDate) return false;
    return new Date(d.dueDate) < new Date(new Date().toISOString().split("T")[0]);
  });

  return { debts, addDebt, togglePaid, updateDebt, deleteDebt, totalPending, totalPaid, overdue };
}
