// Public market data fetchers — no API keys required for BCB/Tesouro.
// Stock quotes route through the existing `stock-proxy` edge function.

import { supabase } from "@/integrations/supabase/client";

export interface MarketRates {
  /** CDI mensal acumulado (% a.m.). Série BCB 4391. */
  cdiMonthly: number | null;
  /** Selic meta anual (% a.a.). Série BCB 1178. */
  selicAnnual: number | null;
  /** IPCA mensal (% a.m.). Série BCB 433. */
  ipcaMonthly: number | null;
  fetchedAt: string;
}

export interface TesouroTitulo {
  code: string;
  /** Taxa de juros anual oferecida ao investidor (% a.a.). */
  annualRate: number;
  maturity: string;
}

const BCB_URL = (id: number) =>
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados/ultimos/1?formato=json`;

async function fetchBcbLast(seriesId: number): Promise<number | null> {
  try {
    const res = await fetch(BCB_URL(seriesId));
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ valor: string }>;
    const raw = data?.[0]?.valor;
    if (!raw) return null;
    return Number(raw.replace(",", "."));
  } catch {
    return null;
  }
}

export async function fetchMarketRates(): Promise<MarketRates> {
  const [cdi, selic, ipca] = await Promise.all([
    fetchBcbLast(4391),
    fetchBcbLast(1178),
    fetchBcbLast(433),
  ]);
  return {
    cdiMonthly: cdi,
    selicAnnual: selic,
    ipcaMonthly: ipca,
    fetchedAt: new Date().toISOString(),
  };
}

const TESOURO_URL =
  "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json";

export async function fetchTesouroTitulos(): Promise<TesouroTitulo[]> {
  try {
    const res = await fetch(TESOURO_URL);
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.response?.TrsrBdTradgList ?? [];
    return list
      .map((it: any) => {
        const bond = it?.TrsrBd;
        if (!bond) return null;
        return {
          code: bond.nm as string,
          annualRate: Number(bond.anulInvstmtRate ?? 0),
          maturity: bond.mtrtyDt as string,
        } as TesouroTitulo;
      })
      .filter((b: TesouroTitulo | null): b is TesouroTitulo => !!b && !!b.code);
  } catch {
    return [];
  }
}

export async function fetchStockQuote(symbol: string, appPassword: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.functions.invoke("stock-proxy", {
      body: { action: "quote", symbol },
      headers: { "x-app-password": appPassword },
    });
    if (error) return null;
    const raw = data?.["Global Quote"]?.["05. price"];
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Converts the investment's external `source` config into the rate that should
 * be stored on the investment. Returns null when the source isn't ready.
 */
export function deriveRateFromSource(
  source: { type: string; multiplier?: number; spread?: number; tesouroCode?: string },
  rates: MarketRates,
  tesouro: TesouroTitulo[],
): { rateOfReturn: number; rateType: "monthly" | "annual" } | null {
  switch (source.type) {
    case "cdi": {
      if (rates.cdiMonthly == null) return null;
      const mult = source.multiplier ?? 1;
      return { rateOfReturn: rates.cdiMonthly * mult, rateType: "monthly" };
    }
    case "selic": {
      if (rates.selicAnnual == null) return null;
      return { rateOfReturn: rates.selicAnnual + (source.spread ?? 0), rateType: "annual" };
    }
    case "ipca": {
      if (rates.ipcaMonthly == null) return null;
      // IPCA mensal anualizado + spread
      const ipcaAnnual = (Math.pow(1 + rates.ipcaMonthly / 100, 12) - 1) * 100;
      return { rateOfReturn: ipcaAnnual + (source.spread ?? 0), rateType: "annual" };
    }
    case "tesouro": {
      const t = tesouro.find(x => x.code === source.tesouroCode);
      if (!t) return null;
      return { rateOfReturn: t.annualRate, rateType: "annual" };
    }
    default:
      return null;
  }
}
