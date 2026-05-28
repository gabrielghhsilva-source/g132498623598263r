## Contexto

O Nubank só exporta um OFX geral da conta — sem campos de "investimento", "rendimento" ou "ativo". Não dá pra puxar dados ricos como uma corretora faria. A saída é dupla:

1. **Tornar o cadastro manual muito mais rápido** (step fixo + chips + entrada em lote por mês).
2. **Espremer o máximo do OFX do Nubank**: detectar resgates/aportes "RDB", "Caixinha", "Aplicação automática", etc., e oferecer um fluxo guiado que cria/atualiza o investimento de uma vez.

Nada de Open Finance / Pluggy — exige empresa regulada e é pago.

---

## O que vai mudar

### 1. Campo "step" e "valores rápidos" por investimento
- Novo campo opcional `contributionStep` (ex: 100) no `Investment`.
- Novo campo opcional `quickAmounts: number[]` (ex: `[100, 200, 300, 500]`).
- Se `contributionStep` estiver definido, o input de aporte vira `<input type="number" step="100" min="100">` e valida múltiplo no submit.
- Se `quickAmounts` estiver definido, aparecem chips clicáveis acima do input. Se não estiver mas tiver `step`, geramos chips automáticos (`step`, `2*step`, `3*step`, `5*step`).
- Aparece tanto no formulário de aporte manual quanto no fluxo do OFX.

### 2. "Aporte rápido" global
- Botão flutuante no `InvestmentDashboard` (ou atalho `A`): abre dialog com:
  - Seletor de investimento (busca por nome).
  - Chips de valor + input com step.
  - Data (default hoje).
- Cria o `ContributionRecord` direto, sem precisar abrir a área.

### 3. Builder de histórico mensal (lote)
- Botão "Preencher histórico" em cada investimento.
- Tabela: linhas = meses (do `startDate` até hoje), colunas = `Aporte` e `Valor no fim do mês` (opcional, pra registrar rendimento real).
- Suporta colar do Excel (split por tab/quebra de linha).
- "Repetir último valor" e "Aplicar a todos" pra acelerar.
- Gera N `ContributionRecord` de uma vez + (opcional) salva snapshots de valor mensal pra mostrar lucro real em vez de só projetado.

### 4. OFX do Nubank mais inteligente
- Ampliar `INVESTMENT_KEYWORDS` em `ofxParser.ts` com termos reais do Nubank: `RDB`, `RESGATE RDB`, `APLIC AUTOMATICA`, `CAIXINHA`, `RENDIMENTO`, `JUROS RDB`, `RENDA EXTRA`, etc.
- Classificar cada transação de investimento como `aporte`, `resgate` ou `rendimento` (heurística por palavra-chave + sinal).
- No `OfxImporter`, agrupar essas transações por "alvo" detectado (ex: tudo que tem "RDB" vai pro mesmo grupo) e mostrar:
  - "Detectamos 8 movimentos que parecem ser do mesmo investimento. Vincular a um existente / criar novo?"
  - Se criar novo: já preenche `startDate` com a data do primeiro aporte e soma os rendimentos detectados como `previouslyInvested`/valor inicial.
- Rendimentos detectados não viram receita do salário — viram histórico do investimento.

### 5. Pequenas melhorias de UX
- Ao criar investimento, sugerir `contributionStep` baseado no nome (ex: contém "Tesouro" → 100; contém "RDB"/"Caixinha" → 1).
- Mostrar no card do investimento o último aporte (data + valor) pra dar feedback rápido.

---

## Detalhes técnicos

**Arquivos a tocar:**
- `src/lib/types.ts` — adicionar `contributionStep?: number`, `quickAmounts?: number[]`, opcional `valueSnapshots?: { date: string; value: number }[]` em `Investment`.
- `src/hooks/useInvestmentStore.ts` — método `addBulkContributions(areaId, investmentId, records[])` e `addValueSnapshot`.
- `src/lib/ofxParser.ts` — expandir keywords, novo campo `investmentKind: "aporte" | "resgate" | "rendimento" | null`.
- `src/components/OfxImporter.tsx` — agrupar por keyword detectada, novo painel "vincular grupo a investimento".
- `src/components/InvestmentDashboard.tsx` — botão "Aporte rápido" + botão "Preencher histórico".
- Novos componentes:
  - `src/components/QuickContributionDialog.tsx` — dialog global de aporte.
  - `src/components/HistoryBuilderDialog.tsx` — tabela mensal de lote.
  - `src/components/ContributionAmountInput.tsx` — input reutilizável com chips + step.

**Compatibilidade:** todos os campos novos são opcionais, dados antigos no localStorage continuam funcionando.

**Tests:** adicionar testes pra `addBulkContributions` e pra classificação de `investmentKind` no parser.

---

## Fora do escopo

- Conexão direta com Nubank/Open Finance (inviável).
- Cálculo automático de IR/come-cotas.
- Importar XML de notas de corretagem (você não usa corretora).

Confirma que faz sentido assim e eu mando bala?