// Minimal OFX (1.x SGML and 2.x XML) parser for bank statements.
// Extracts transactions and ledger balance.

export interface OfxTransaction {
  id: string;            // FITID
  date: string;          // YYYY-MM-DD
  amount: number;        // signed
  type: "CREDIT" | "DEBIT" | "OTHER";
  memo: string;
}

export interface OfxStatement {
  balance: number | null;
  balanceDate: string | null;
  currency: string | null;
  transactions: OfxTransaction[];
}

function stripHeader(raw: string): string {
  // OFX 1.x has SGML headers before the <OFX> tag
  const i = raw.indexOf("<OFX>");
  return i >= 0 ? raw.slice(i) : raw;
}

/** Convert OFX SGML (unclosed tags) to well-formed XML-ish by closing leaf tags. */
function sgmlToXml(src: string): string {
  // Each line like "<TAG>value" -> "<TAG>value</TAG>"
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
  // YYYYMMDD or YYYYMMDDHHMMSS[.XXX][TZ]
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(s.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
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
    return { id: fitid, date: dt, amount, type, memo: memo || (amount >= 0 ? "Crédito" : "Débito") };
  });

  return {
    balance: balAmt !== null ? Number(balAmt.replace(",", ".")) : null,
    balanceDate: balDt ? parseOfxDate(balDt) : null,
    currency,
    transactions,
  };
}
