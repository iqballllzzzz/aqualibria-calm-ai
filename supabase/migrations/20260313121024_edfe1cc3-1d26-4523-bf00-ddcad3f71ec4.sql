-- Study profile per Firebase user
CREATE TABLE IF NOT EXISTS public.study_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  age_group TEXT NOT NULL,
  education_level TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study analysis history (encrypted payload stored by backend function)
CREATE TABLE IF NOT EXISTS public.study_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Riwayat Pembelajaran',
  source_type TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  study_mode TEXT NOT NULL,
  tone_style TEXT,
  mindmap_layout TEXT,
  encrypted_payload TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_profiles_firebase_uid ON public.study_profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_study_histories_firebase_uid_created_at ON public.study_histories(firebase_uid, created_at DESC);

ALTER TABLE public.study_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_histories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='study_profiles' AND policyname='Deny all direct access to study_profiles'
  ) THEN
    CREATE POLICY "Deny all direct access to study_profiles"
    ON public.study_profiles
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='study_histories' AND policyname='Deny all direct access to study_histories'
  ) THEN
    CREATE POLICY "Deny all direct access to study_histories"
    ON public.study_histories
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_study_profiles_updated_at
    BEFORE UPDATE ON public.study_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_histories_updated_at'
  ) THEN
    CREATE TRIGGER update_study_histories_updated_at
    BEFORE UPDATE ON public.study_histories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;