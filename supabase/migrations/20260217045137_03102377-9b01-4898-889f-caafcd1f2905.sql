
-- Add status and archived_at columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Update handle_new_user to auto-assign coach_id for clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _coach_id uuid;
BEGIN
  -- Find the coach by email
  IF NEW.email = 'larry92roche@gmail.com' THEN
    INSERT INTO public.profiles (id, name, email, role, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      'coach'::app_role,
      'active'
    );
  ELSE
    -- Find the main coach's user id
    SELECT id INTO _coach_id FROM public.profiles WHERE email = 'larry92roche@gmail.com' AND role = 'coach' LIMIT 1;
    
    INSERT INTO public.profiles (id, name, email, role, coach_id, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      'client'::app_role,
      _coach_id,
      'active'
    );
  END IF;
  RETURN NEW;
END;
$function$;
