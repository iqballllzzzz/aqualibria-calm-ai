DROP POLICY IF EXISTS "No direct access to llamacoder rate limits" ON public.llamacoder_rate_limits;
CREATE POLICY "No direct access to llamacoder rate limits"
  ON public.llamacoder_rate_limits
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;