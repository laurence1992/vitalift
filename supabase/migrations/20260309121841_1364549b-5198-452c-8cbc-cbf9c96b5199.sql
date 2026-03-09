
-- Allow coaches to self-assign programs (insert, read, update, delete their own assignments)
CREATE POLICY "Coaches manage own training assignments"
ON public.client_program_assignments
FOR ALL
TO authenticated
USING (
  client_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'coach'::app_role
)
WITH CHECK (
  client_id = auth.uid()
  AND public.get_user_role(auth.uid()) = 'coach'::app_role
);
