// Auto-categorização simples por palavras-chave (PT-BR).
// Categorias padrão + cor associada para gráficos.

export type ExpenseCategory =
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "lazer"
  | "saude"
  | "educacao"
  | "contas"
  | "compras"
  | "outros";

export const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; emoji: string }> = {
  alimentacao: { label: "Alimentação", color: "hsl(20 90% 60%)",  emoji: "🍔" },
  transporte:  { label: "Transporte",  color: "hsl(200 80% 55%)", emoji: "🚗" },
  moradia:     { label: "Moradia",     color: "hsl(280 70% 60%)", emoji: "🏠" },
  lazer:       { label: "Lazer",       color: "hsl(340 80% 60%)", emoji: "🎮" },
  saude:       { label: "Saúde",       color: "hsl(160 70% 45%)", emoji: "💊" },
  educacao:    { label: "Educação",    color: "hsl(45 95% 55%)",  emoji: "📚" },
  contas:      { label: "Contas",      color: "hsl(0 75% 60%)",   emoji: "💡" },
  compras:     { label: "Compras",     color: "hsl(310 70% 55%)", emoji: "🛍️" },
  outros:      { label: "Outros",      color: "hsl(220 10% 55%)", emoji: "📦" },
};

const RULES: { cat: ExpenseCategory; words: string[] }[] = [
  { cat: "alimentacao", words: ["mercado","supermercado","ifood","rappi","restaurante","padaria","lanchonete","açougue","hortifruti","carrefour","extra","assai","atacadao","pao de acucar","mc donald","burger","subway","pizza","mercadinho"] },
  { cat: "transporte",  words: ["uber","99","cabify","gasolina","combustivel","posto","etanol","estacionamento","oficina","ipva","onibus","metro","passagem","pedagio","auto posto"] },
  { cat: "moradia",     words: ["aluguel","condominio","iptu","reforma","casa","mudanca","leroy","tok stok","tokstok"] },
  { cat: "lazer",       words: ["cinema","netflix","spotify","steam","xbox","playstation","prime video","disney","hbo","jogo","bar","balada","viagem","airbnb","hotel"] },
  { cat: "saude",       words: ["farmacia","drogaria","drogasil","raia","hospital","clinica","medico","dentista","exame","laboratorio","psicologo","plano de saude","unimed","amil"] },
  { cat: "educacao",    words: ["faculdade","escola","curso","udemy","alura","livro","material escolar","mensalidade"] },
  { cat: "contas",      words: ["luz","energia","cemig","copel","enel","agua","sabesp","internet","vivo","claro","tim","oi","telefone","gas","boleto","fatura","cartao"] },
  { cat: "compras",     words: ["mercado livre","amazon","shopee","aliexpress","magalu","americanas","casas bahia","shein","zara","renner","riachuelo","c&a","loja"] },
];

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function categorize(text: string): ExpenseCategory {
  const t = norm(text || "");
  if (!t.trim()) return "outros";
  for (const { cat, words } of RULES) {
    for (const w of words) {
      if (t.includes(norm(w))) return cat;
    }
  }
  return "outros";
}

export const CATEGORY_LIST: ExpenseCategory[] = [
  "alimentacao","transporte","moradia","lazer","saude","educacao","contas","compras","outros",
];
