CREATE TABLE IF NOT EXISTS public.credit_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','slides','designer','fullstack')),
  amount integer NOT NULL CHECK (amount > 0),
  source text NOT NULL DEFAULT 'daily' CHECK (source IN ('daily','monthly')),
  plan text NOT NULL DEFAULT 'junior',
  balance_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit logs" ON public.credit_usage_logs;
CREATE POLICY "Users can view their own credit logs"
  ON public.credit_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_user_created
  ON public.credit_usage_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.llamacoder_rate_limits (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.llamacoder_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.plan_daily_quota(_plan text)
RETURNS TABLE(d_fullstack int, d_slides int, d_designer int)
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT
    CASE _plan WHEN 'nigown' THEN 999999 WHEN 'superior' THEN 50 WHEN 'senior' THEN 20 ELSE 5 END,
    CASE _plan WHEN 'nigown' THEN 999999 WHEN 'superior' THEN 60 WHEN 'senior' THEN 30 ELSE 8 END,
    CASE _plan WHEN 'nigown' THEN 999999 WHEN 'superior' THEN 100 WHEN 'senior' THEN 50 ELSE 20 END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_init_credits(_user_id uuid, _plan text)
RETURNS public.user_credits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  row public.user_credits;
  q_img int;
  q_fs int;
  d_fs int;
  d_sl int;
  d_dg int;
BEGIN
  SELECT image_q, fullstack_q INTO q_img, q_fs FROM public.plan_credit_quota(_plan);
  SELECT d_fullstack, d_slides, d_designer INTO d_fs, d_sl, d_dg FROM public.plan_daily_quota(_plan);

  SELECT * INTO row FROM public.user_credits WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, image_credits, fullstack_credits, period_start,
      daily_fullstack, daily_slides, daily_designer, daily_reset_at)
    VALUES (_user_id, _plan, q_img, q_fs, now(), d_fs, d_sl, d_dg, now())
    RETURNING * INTO row;
    RETURN row;
  END IF;

  IF row.period_start < now() - interval '30 days' OR row.plan <> _plan THEN
    UPDATE public.user_credits
       SET plan = _plan,
           image_credits = q_img,
           fullstack_credits = q_fs,
           period_start = now(),
           daily_fullstack = d_fs,
           daily_slides = d_sl,
           daily_designer = d_dg,
           daily_reset_at = now()
     WHERE user_id = _user_id
     RETURNING * INTO row;
    RETURN row;
  END IF;

  IF row.daily_reset_at < now() - interval '24 hours' THEN
    UPDATE public.user_credits
       SET daily_fullstack = d_fs,
           daily_slides = d_sl,
           daily_designer = d_dg,
           daily_reset_at = now()
     WHERE user_id = _user_id
     RETURNING * INTO row;
  END IF;

  RETURN row;
END;
$$;

DROP FUNCTION IF EXISTS public.consume_credit(uuid, text, integer);
CREATE FUNCTION public.consume_credit(_user_id uuid, _kind text, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  before_row public.user_credits;
  after_row public.user_credits;
  source_used text := null;
BEGIN
  IF _amount IS NULL OR _amount < 1 OR _amount > 100 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  SELECT * INTO before_row FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_credits');
  END IF;

  IF _kind = 'fullstack' THEN
    IF before_row.daily_fullstack >= _amount THEN
      UPDATE public.user_credits SET daily_fullstack = daily_fullstack - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'daily';
    ELSIF before_row.fullstack_credits >= _amount THEN
      UPDATE public.user_credits SET fullstack_credits = fullstack_credits - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'monthly';
    END IF;
  ELSIF _kind = 'slides' THEN
    IF before_row.daily_slides >= _amount THEN
      UPDATE public.user_credits SET daily_slides = daily_slides - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'daily';
    ELSIF before_row.image_credits >= _amount THEN
      UPDATE public.user_credits SET image_credits = image_credits - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'monthly';
    END IF;
  ELSIF _kind = 'designer' THEN
    IF before_row.daily_designer >= _amount THEN
      UPDATE public.user_credits SET daily_designer = daily_designer - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'daily';
    ELSIF before_row.image_credits >= _amount THEN
      UPDATE public.user_credits SET image_credits = image_credits - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'monthly';
    END IF;
  ELSIF _kind = 'image' THEN
    IF before_row.image_credits >= _amount THEN
      UPDATE public.user_credits SET image_credits = image_credits - _amount WHERE user_id = _user_id RETURNING * INTO after_row;
      source_used := 'monthly';
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  END IF;

  IF source_used IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_credits', 'credits', to_jsonb(before_row));
  END IF;

  INSERT INTO public.credit_usage_logs (user_id, kind, amount, source, plan, balance_after)
  VALUES (_user_id, _kind, _amount, source_used, after_row.plan, to_jsonb(after_row));

  RETURN jsonb_build_object('ok', true, 'source', source_used, 'credits', to_jsonb(after_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.check_llamacoder_rate_limit(_user_id uuid, _plan text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  window_ts timestamptz := date_trunc('minute', now());
  max_per_minute int := CASE _plan WHEN 'nigown' THEN 30 WHEN 'superior' THEN 15 WHEN 'senior' THEN 8 ELSE 3 END;
  current_count int;
  blocked timestamptz;
BEGIN
  SELECT request_count, blocked_until INTO current_count, blocked
  FROM public.llamacoder_rate_limits
  WHERE user_id = _user_id AND window_start = window_ts
  FOR UPDATE;

  IF blocked IS NOT NULL AND blocked > now() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'temporarily_blocked', 'retry_after_seconds', ceil(extract(epoch from (blocked - now()))));
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.llamacoder_rate_limits (user_id, window_start, request_count)
    VALUES (_user_id, window_ts, 1);
    RETURN jsonb_build_object('allowed', true, 'remaining', max_per_minute - 1);
  END IF;

  IF current_count >= max_per_minute THEN
    UPDATE public.llamacoder_rate_limits
       SET request_count = request_count + 1,
           blocked_until = CASE WHEN current_count >= max_per_minute * 2 THEN now() + interval '5 minutes' ELSE blocked_until END,
           updated_at = now()
     WHERE user_id = _user_id AND window_start = window_ts;
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', 60 - extract(second from now())::int);
  END IF;

  UPDATE public.llamacoder_rate_limits
     SET request_count = request_count + 1, updated_at = now()
   WHERE user_id = _user_id AND window_start = window_ts;
  RETURN jsonb_build_object('allowed', true, 'remaining', max_per_minute - current_count - 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_regression_suite()
RETURNS TABLE(plan text, kind text, daily_before int, monthly_before int, requested int, source text, ok boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH plans(plan, fs_daily, slides_daily, designer_daily, img_monthly, fs_monthly) AS (
    VALUES
      ('junior'::text, 5, 8, 20, 0, 0),
      ('senior'::text, 20, 30, 50, 300, 200),
      ('superior'::text, 50, 60, 100, 1500, 1000),
      ('nigown'::text, 999999, 999999, 999999, 999999, 999999)
  ), cases AS (
    SELECT plan, 'fullstack'::text AS kind, fs_daily AS d, fs_monthly AS m, 1 AS requested FROM plans
    UNION ALL SELECT plan, 'slides', slides_daily, img_monthly, 4 FROM plans
    UNION ALL SELECT plan, 'designer', designer_daily, img_monthly, 1 FROM plans
    UNION ALL SELECT plan, 'slides', 0, img_monthly, 4 FROM plans WHERE img_monthly >= 4
  )
  SELECT c.plan, c.kind, c.d, c.m, c.requested,
         CASE WHEN c.d >= c.requested THEN 'daily' ELSE 'monthly' END AS source,
         ((c.d >= c.requested) OR (c.m >= c.requested)) AS ok
  FROM cases c
  ORDER BY c.plan, c.kind, c.d DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.plan_credit_quota(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_daily_quota(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_init_credits(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_llamacoder_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_regression_suite() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_credit_quota(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.plan_daily_quota(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_init_credits(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_credit(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_llamacoder_rate_limit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_regression_suite() TO service_role;