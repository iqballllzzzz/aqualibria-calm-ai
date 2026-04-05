
-- Add published_url column
ALTER TABLE public.agent_projects ADD COLUMN IF NOT EXISTS published_url TEXT UNIQUE;

-- Allow anyone to view published projects
CREATE POLICY "Anyone can view published projects"
ON public.agent_projects
FOR SELECT
USING (is_published = true);
