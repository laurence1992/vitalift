-- Security definer function to reconcile orphan clients to a coach
-- This bypasses RLS so the coach can claim clients with null coach_id
CREATE OR REPLACE FUNCTION public.reconcile_orphan_clients(_coach_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  -- Only allow coaches to call this
  IF (SELECT role FROM public.profiles WHERE id = _coach_id) != 'coach' THEN
    RETURN 0;
  END IF;
  
  -- Assign orphan clients (role=client, coach_id IS NULL) to this coach
  UPDATE public.profiles
  SET coach_id = _coach_id,
      status = CASE WHEN status IS NULL OR status = '' THEN 'active' ELSE status END
  WHERE role = 'client'
    AND coach_id IS NULL;
  
  GET DIAGNOSTICS _count = ROW_COUNT;
  
  -- Also backfill any clients of this coach with null/empty status
  UPDATE public.profiles
  SET status = 'active'
  WHERE role = 'client'
    AND coach_id = _coach_id
    AND (status IS NULL OR status = '');
  
  RETURN _count;
END;
$$;