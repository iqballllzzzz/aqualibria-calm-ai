CREATE TABLE public.shared_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  shared_by_name text,
  title text NOT NULL DEFAULT 'Shared Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.shared_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared chats"
  ON public.shared_chats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Deny direct insert to shared_chats"
  ON public.shared_chats FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny direct update to shared_chats"
  ON public.shared_chats FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny direct delete to shared_chats"
  ON public.shared_chats FOR DELETE
  TO anon, authenticated
  USING (false);