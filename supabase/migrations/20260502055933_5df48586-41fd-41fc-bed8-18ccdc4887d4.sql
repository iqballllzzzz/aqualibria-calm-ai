-- Tabel kredit bulanan
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'junior',
  image_credits integer NOT NULL DEFAULT 0,
  fullstack_credits integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Tidak ada policy INSERT/UPDATE/DELETE untuk anon/authenticated.
-- Semua mutasi lewat edge function dengan service_role key.

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: dapatkan jatah kredit per plan
CREATE OR REPLACE FUNCTION public.plan_credit_quota(_plan text)
RETURNS TABLE(image_q integer, fullstack_q integer)
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT
    CASE _plan
      WHEN 'nigown' THEN 999999
      WHEN 'superior' THEN 1500
      WHEN 'senior' THEN 300
      ELSE 0
    END,
    CASE _plan
      WHEN 'nigown' THEN 999999
      WHEN 'superior' THEN 1000
      WHEN 'senior' THEN 200
      ELSE 0
    END;
$$;

-- Init / reset kredit kalau periodenya >= 30 hari
CREATE OR REPLACE FUNCTION public.get_or_init_credits(_user_id uuid, _plan text)
RETURNS public.user_credits
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.user_credits;
  q_img integer;
  q_fs integer;
BEGIN
  SELECT image_q, fullstack_q INTO q_img, q_fs FROM public.plan_credit_quota(_plan);

  SELECT * INTO row FROM public.user_credits WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, image_credits, fullstack_credits, period_start)
    VALUES (_user_id, _plan, q_img, q_fs, now())
    RETURNING * INTO row;
    RETURN row;
  END IF;

  -- Reset jika sudah > 30 hari ATAU plan berubah
  IF row.period_start < now() - interval '30 days' OR row.plan <> _plan THEN
    UPDATE public.user_credits
       SET plan = _plan,
           image_credits = q_img,
           fullstack_credits = q_fs,
           period_start = now()
     WHERE user_id = _user_id
    RETURNING * INTO row;
  END IF;

  RETURN row;
END;
$$;

-- Konsumsi kredit secara atomic
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid, _kind text, _amount integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF _kind = 'image' THEN
    UPDATE public.user_credits
       SET image_credits = image_credits - _amount
     WHERE user_id = _user_id AND image_credits >= _amount
    RETURNING true INTO ok;
  ELSIF _kind = 'fullstack' THEN
    UPDATE public.user_credits
       SET fullstack_credits = fullstack_credits - _amount
     WHERE user_id = _user_id AND fullstack_credits >= _amount
    RETURNING true INTO ok;
  END IF;

  RETURN COALESCE(ok, false);
END;
$$;