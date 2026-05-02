REVOKE EXECUTE ON FUNCTION public.get_or_init_credits(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_credit_quota(text) FROM PUBLIC, anon, authenticated;