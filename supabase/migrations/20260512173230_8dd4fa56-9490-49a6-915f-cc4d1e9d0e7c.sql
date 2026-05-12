-- Single-row-per-key state table for cloud persistence
CREATE TABLE public.app_state (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Public access (no auth, shared data — explicit user choice)
CREATE POLICY "Public read app_state"   ON public.app_state FOR SELECT USING (true);
CREATE POLICY "Public insert app_state" ON public.app_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update app_state" ON public.app_state FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete app_state" ON public.app_state FOR DELETE USING (true);

-- Seed: tasks_areas with recognizable [CLOUD] markers
INSERT INTO public.app_state (key, data) VALUES
('tasks_areas', '[
  {"id":"work","name":"Trabalho","icon":"💼","collapsed":false,"tasks":[
    {"id":"seed-t1","text":"[CLOUD] Esta tarefa veio do banco ☁️","status":"todo","style":{"size":"base","weight":"semibold","color":"#0ea5e9"},"createdAt":"2026-05-12T12:00:00.000Z","comments":[],"priority":"high","tagIds":[],"subtasks":[]},
    {"id":"seed-t2","text":"[CLOUD] Reunião de migração","status":"in-progress","style":{"size":"base","weight":"normal","color":"#171717"},"createdAt":"2026-05-12T12:00:00.000Z","comments":[],"priority":"medium","tagIds":[],"subtasks":[]},
    {"id":"seed-t3","text":"[CLOUD] Validar persistência no Cloud","status":"done","style":{"size":"base","weight":"normal","color":"#171717"},"createdAt":"2026-05-12T12:00:00.000Z","comments":[],"priority":"low","tagIds":[],"subtasks":[]}
  ]},
  {"id":"games","name":"Jogos","icon":"🎮","collapsed":false,"tasks":[]},
  {"id":"leisure","name":"Lazer","icon":"☀️","collapsed":false,"tasks":[]},
  {"id":"home","name":"Afazeres Domésticos","icon":"🏠","collapsed":false,"tasks":[]},
  {"id":"investments","name":"Investimentos","icon":"📈","collapsed":false,"tasks":[]}
]'::jsonb),
('debts', '[
  {"id":"seed-d1","name":"[CLOUD] Conta de Luz","amount":287.50,"dueDate":"2026-05-20","category":"Casa","paid":false,"createdAt":"2026-05-12T12:00:00.000Z"},
  {"id":"seed-d2","name":"[CLOUD] Internet","amount":129.90,"dueDate":"2026-05-15","category":"Casa","paid":false,"createdAt":"2026-05-12T12:00:00.000Z"},
  {"id":"seed-d3","name":"[CLOUD] Cartão Nubank","amount":1450.00,"dueDate":"2026-05-25","category":"Cartão","paid":false,"createdAt":"2026-05-12T12:00:00.000Z"},
  {"id":"seed-d4","name":"[CLOUD] Netflix (já pago)","amount":55.90,"category":"Assinaturas","paid":true,"paidAt":"2026-05-01T00:00:00.000Z","createdAt":"2026-05-12T12:00:00.000Z"}
]'::jsonb);