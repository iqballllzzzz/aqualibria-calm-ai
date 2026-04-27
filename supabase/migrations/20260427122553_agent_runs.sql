-- Audit log for every command/tool call the Master Architect agent executes.
-- Each row corresponds to a single tool invocation (run_cmd, write_file, etc.).
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.agent_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool TEXT NOT NULL,
  cmd TEXT,
  cwd TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,
  stdout_truncated TEXT,
  stderr_truncated TEXT,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON public.agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent runs"
  ON public.agent_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert agent runs"
  ON public.agent_runs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.agent_runs IS
  'Audit log of every tool/command executed by the Aqualibria Master Architect agent. Used for billing, debugging, and abuse detection.';
