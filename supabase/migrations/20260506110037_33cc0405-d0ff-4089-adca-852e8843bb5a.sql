
-- Add daily quota columns
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS daily_fullstack int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_slides int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_designer int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_reset_at timestamptz NOT NULL DEFAULT now();

-- Daily quota by plan
CREATE OR REPLACE FUNCTION public.plan_daily_quota(_plan text)
RETURNS TABLE(d_fullstack int, d_slides int, d_designer int)
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT
    CASE _plan
      WHEN 'nigown' THEN 999999
      WHEN 'superior' THEN 50
      WHEN 'senior' THEN 20
      ELSE 5
    END,
    CASE _plan
      WHEN 'nigown' THEN 999999
      WHEN 'superior' THEN 60
      WHEN 'senior' THEN 30
      ELSE 8
    END,
    CASE _plan
      WHEN 'nigown' THEN 999999
      WHEN 'superior' THEN 100
      WHEN 'senior' THEN 50
      ELSE 20
    END;
$$;

-- Replace get_or_init_credits to also init / reset daily quotas
CREATE OR REPLACE FUNCTION public.get_or_init_credits(_user_id uuid, _plan text)
RETURNS user_credits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  row public.user_credits;
  q_img int; q_fs int;
  d_fs int; d_sl int; d_dg int;
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

  -- Monthly reset (30 days) or plan change
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

  -- Daily reset (24 hours)
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

-- Replace consume_credit with multi-kind logic (daily-first, then monthly fallback)
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid, _kind text, _amount int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF _kind = 'fullstack' THEN
    -- Try daily quota first
    UPDATE public.user_credits
       SET daily_fullstack = daily_fullstack - _amount
     WHERE user_id = _user_id AND daily_fullstack >= _amount
    RETURNING true INTO ok;
    IF NOT FOUND THEN
      UPDATE public.user_credits
         SET fullstack_credits = fullstack_credits - _amount
       WHERE user_id = _user_id AND fullstack_credits >= _amount
      RETURNING true INTO ok;
    END IF;
  ELSIF _kind = 'slides' THEN
    UPDATE public.user_credits
       SET daily_slides = daily_slides - _amount
     WHERE user_id = _user_id AND daily_slides >= _amount
    RETURNING true INTO ok;
    IF NOT FOUND THEN
      -- fall back to monthly image_credits (slides are images)
      UPDATE public.user_credits
         SET image_credits = image_credits - _amount
       WHERE user_id = _user_id AND image_credits >= _amount
      RETURNING true INTO ok;
    END IF;
  ELSIF _kind = 'designer' THEN
    UPDATE public.user_credits
       SET daily_designer = daily_designer - _amount
     WHERE user_id = _user_id AND daily_designer >= _amount
    RETURNING true INTO ok;
    IF NOT FOUND THEN
      UPDATE public.user_credits
         SET image_credits = image_credits - _amount
       WHERE user_id = _user_id AND image_credits >= _amount
      RETURNING true INTO ok;
    END IF;
  ELSIF _kind = 'image' THEN
    UPDATE public.user_credits
       SET image_credits = image_credits - _amount
     WHERE user_id = _user_id AND image_credits >= _amount
    RETURNING true INTO ok;
  END IF;

  RETURN COALESCE(ok, false);
END;
$$;
