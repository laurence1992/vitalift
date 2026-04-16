
-- 1. Fix profiles INSERT policy to prevent role self-assignment
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  id = auth.uid()
  AND role = 'client'::app_role
);

-- 2. Fix coach UPDATE policy to prevent role escalation
DROP POLICY IF EXISTS "Coaches can update their clients" ON public.profiles;
CREATE POLICY "Coaches can update their clients"
ON public.profiles FOR UPDATE
USING (
  get_user_role(auth.uid()) = 'coach'::app_role
  AND coach_id = auth.uid()
)
WITH CHECK (
  get_user_role(auth.uid()) = 'coach'::app_role
  AND coach_id = auth.uid()
  AND role = 'client'::app_role
);

-- 3. Remove public storage read policy that exposes private files
DROP POLICY IF EXISTS "Anyone can view public media" ON storage.objects;

-- 4. Add UPDATE/DELETE policies for workout_sets
CREATE POLICY "Clients update own sets"
ON public.workout_sets FOR UPDATE
USING (workout_id IN (SELECT id FROM workouts WHERE client_id = auth.uid()))
WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE client_id = auth.uid()));

CREATE POLICY "Clients delete own sets"
ON public.workout_sets FOR DELETE
USING (workout_id IN (SELECT id FROM workouts WHERE client_id = auth.uid()));

-- 5. Add UPDATE/DELETE policies for workouts
CREATE POLICY "Clients update own workouts"
ON public.workouts FOR UPDATE
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients delete own workouts"
ON public.workouts FOR DELETE
USING (client_id = auth.uid());
