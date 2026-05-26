-- Drop old public policies first
DROP POLICY IF EXISTS "Public delete app_state" ON public.app_state;
DROP POLICY IF EXISTS "Public insert app_state" ON public.app_state;
DROP POLICY IF EXISTS "Public read app_state" ON public.app_state;
DROP POLICY IF EXISTS "Public update app_state" ON public.app_state;

-- Wipe existing rows (no owner, can't be migrated safely)
TRUNCATE TABLE public.app_state;

-- Add user_id column NOT NULL
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;

-- Rebuild primary key as (key, user_id) so each user has their own keyspace
ALTER TABLE public.app_state DROP CONSTRAINT IF EXISTS app_state_pkey;
ALTER TABLE public.app_state ADD CONSTRAINT app_state_pkey PRIMARY KEY (key, user_id);

-- Lock down access: only authenticated users, only their own rows
REVOKE ALL ON public.app_state FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

CREATE POLICY "Users read own app_state"
  ON public.app_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own app_state"
  ON public.app_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own app_state"
  ON public.app_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own app_state"
  ON public.app_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);