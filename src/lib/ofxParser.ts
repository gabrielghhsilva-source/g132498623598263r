// Minimal OFX (1.x SGML and 2.x XML) parser for bank statements.
// Extracts transactions and ledger balance.

export interface OfxTransaction {
  id: string;            // FITID
  date: string;          // YYYY-MM-DD
  amount: number;        // signed
  type: "CREDIT" | "DEBIT" | "OTHER";
  memo: string;          // raw memo
  party: string;         // cleaned counter-party name
  isInvestment: boolean; // looks like an investment / brokerage movement
}

export interface OfxStatement {
  balance: number | null;
  balanceDate: string | null;
  currency: string | null;
  transactions: OfxTransaction[];
}

function stripHeader(raw: string): string {
  const i = raw.indexOf("<OFX>");
  return i >= 0 ? raw.slice(i) : raw;
}

/** Convert OFX SGML (unclosed tags) to well-formed XML-ish by closing leaf tags. */
function sgmlToXml(src: string): string {
  return src.replace(/<([A-Z0-9.]+)>([^<\r\n]+)(?=\s*<)/g, (_m, tag, val) => {
    return `<${tag}>${val.trim()}</${tag}>`;
  });
}

function extractAll(src: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

function extractOne(src: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(src);
  return m ? m[1].trim() : null;
}

function parseOfxDate(s: string | null): string {
  if (!s) return "";
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(s.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// Tokens stripped from start/inside of memos to isolate the counter-party name.
const NOISE_TOKENS = [
  "PIX", "TED", "DOC", "TEF", "TRANSF", "TRANSFERENCIA", "TRANSFERÊNCIA",
  "ENVIADO", "ENVIADA", "RECEBIDO", "RECEBIDA",
  "PAGAMENTO", "PGTO", "PAG", "BOLETO", "FATURA",
  "COMPRA", "COMPRAS", "DEBITO", "DÉBITO", "CREDITO", "CRÉDITO",
  "AUTOMATICO", "AUTOMÁTICO", "CARTAO", "CARTÃO",
  "SAQUE", "DEPOSITO", "DEPÓSITO",
  "QRS", "QRES", "QRCODE", "QR", "DA", "DE", "DO",
];

const INVESTMENT_KEYWORDS = [
  "APLIC", "APLICACAO", "APLICAÇÃO", "RESGATE",
  "INVEST", "INVESTIMENTO", "CDB", "LCI", "LCA",
  "TESOURO", "SELIC", "IPCA",
  "FUNDO", "RENDA FIXA", "POUPANCA", "POUPANÇA",
  "NUINVEST", "XPI", "XP INVEST", "RICO", "BTG", "AVENUE",
  "CORRETORA", "B3", "BOLSA", "ACAO", "AÇÃO", "ACOES", "AÇÕES",
  "PREVIDENCIA", "PREVIDÊNCIA",
];

/** Clean an OFX memo into a human-friendly counter-party name. */
export function extractParty(memo: string): string {
  if (!memo) return "";
  let s = memo.replace(/\s+/g, " ").trim();
  // Drop trailing date fragments like 12/03 or 12/03/2025
  s = s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ");
  // Drop standalone numeric/code chunks at the end
  s = s.replace(/\s+[\d.\-\/]{4,}\s*$/g, "");
  // Drop noise tokens from the start
  const noise = new Set(NOISE_TOKENS.map(t => t.toUpperCase()));
  const parts = s.split(/\s+/);
  while (parts.length && noise.has(parts[0].toUpperCase().replace(/[^A-ZÀ-Ú]/g, ""))) {
    parts.shift();
  }
  let cleaned = parts.join(" ").replace(/\s+/g, " ").trim();
  // Title-case if it's all uppercase
  if (cleaned && cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/\b\p{L}/gu, c => c.toUpperCase());
  }
  return cleaned || memo.trim();
}

export function looksLikeInvestment(memo: string): boolean {
  const up = (memo || "").toUpperCase();
  return INVESTMENT_KEYWORDS.some(k => up.includes(k));
}

export function parseOFX(raw: string): OfxStatement {
  const cleaned = sgmlToXml(stripHeader(raw));

  const currency = extractOne(cleaned, "CURDEF");
  const balAmt = extractOne(cleaned, "BALAMT");
  const balDt = extractOne(cleaned, "DTASOF");

  const txnBlocks = extractAll(cleaned, "STMTTRN");
  const transactions: OfxTransaction[] = txnBlocks.map((blk, idx) => {
    const fitid = extractOne(blk, "FITID") || `txn-${idx}`;
    const dt = parseOfxDate(extractOne(blk, "DTPOSTED"));
    const amtRaw = extractOne(blk, "TRNAMT") || "0";
    const amount = Number(amtRaw.replace(",", "."));
    const trntype = (extractOne(blk, "TRNTYPE") || "").toUpperCase();
    const memo = (extractOne(blk, "MEMO") || extractOne(blk, "NAME") || "").trim();
    const type: OfxTransaction["type"] =
      trntype === "CREDIT" || amount > 0 ? "CREDIT" :
      trntype === "DEBIT"  || amount < 0 ? "DEBIT"  : "OTHER";
    return {
      id: fitid,
      date: dt,
      amount,
      type,
      memo: memo || (amount >= 0 ? "Crédito" : "Débito"),
      party: extractParty(memo),
      isInvestment: looksLikeInvestment(memo),
    };
  });

  return {
    balance: balAmt !== null ? Number(balAmt.replace(",", ".")) : null,
    balanceDate: balDt ? parseOfxDate(balDt) : null,
    currency,
    transactions,
  };
}
