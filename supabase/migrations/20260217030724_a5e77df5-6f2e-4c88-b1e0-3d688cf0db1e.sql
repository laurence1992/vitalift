
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    CASE 
      WHEN NEW.email = 'larry92roche@gmail.com' THEN 'coach'::app_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
    END
  );
  RETURN NEW;
END;
$$;
