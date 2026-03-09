
-- Table to store personal bests per user per exercise
CREATE TABLE public.personal_bests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.coach_exercises(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  reps integer,
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);

ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;

-- Users can read their own PBs
CREATE POLICY "Users read own PBs"
ON public.personal_bests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own PBs
CREATE POLICY "Users insert own PBs"
ON public.personal_bests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own PBs
CREATE POLICY "Users update own PBs"
ON public.personal_bests
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Coaches can view their clients' PBs
CREATE POLICY "Coaches view client PBs"
ON public.personal_bests
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'coach'::app_role
  AND user_id IN (SELECT id FROM public.profiles WHERE coach_id = auth.uid())
);

-- Deny anonymous
CREATE POLICY "Deny anon access to personal_bests"
ON public.personal_bests
FOR ALL
TO anon
USING (false);
