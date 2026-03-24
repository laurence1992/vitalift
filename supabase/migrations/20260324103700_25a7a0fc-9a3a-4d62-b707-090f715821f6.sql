
-- Fix: Restrict profiles UPDATE policy to prevent role/coach_id escalation
-- Users should only be able to update their name, not role or coach_id

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = get_user_role(auth.uid())
  AND coach_id IS NOT DISTINCT FROM get_user_coach_id(auth.uid())
);
