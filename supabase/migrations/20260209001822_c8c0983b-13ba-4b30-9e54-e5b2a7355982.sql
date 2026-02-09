
-- Fix function search path warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop all permissive policies
DROP POLICY IF EXISTS "Allow all operations for user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all operations for ai_memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Allow all operations for chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow all operations for chat_messages" ON public.chat_messages;

-- Lock down all tables - deny direct access (data is managed via localStorage and edge functions)
CREATE POLICY "Deny all direct access to user_profiles"
  ON public.user_profiles FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all direct access to ai_memory"
  ON public.ai_memory FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all direct access to chat_sessions"
  ON public.chat_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all direct access to chat_messages"
  ON public.chat_messages FOR ALL
  USING (false)
  WITH CHECK (false);
