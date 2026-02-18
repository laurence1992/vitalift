
-- 1. Add database constraints for input validation on health_entries
ALTER TABLE public.health_entries
ADD CONSTRAINT valid_steps CHECK (steps IS NULL OR (steps >= 0 AND steps <= 200000)),
ADD CONSTRAINT valid_sleep CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24)),
ADD CONSTRAINT valid_bodyweight CHECK (bodyweight IS NULL OR (bodyweight > 0 AND bodyweight <= 1000)),
ADD CONSTRAINT valid_body_fat CHECK (body_fat IS NULL OR (body_fat >= 0 AND body_fat <= 100)),
ADD CONSTRAINT valid_resting_hr CHECK (resting_hr IS NULL OR (resting_hr >= 20 AND resting_hr <= 300)),
ADD CONSTRAINT valid_caloric_intake CHECK (caloric_intake IS NULL OR (caloric_intake >= 0 AND caloric_intake <= 50000)),
ADD CONSTRAINT valid_calories_burned CHECK (calories_burned IS NULL OR (calories_burned >= 0 AND calories_burned <= 50000)),
ADD CONSTRAINT valid_bp_systolic CHECK (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 50 AND blood_pressure_systolic <= 300)),
ADD CONSTRAINT valid_bp_diastolic CHECK (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 30 AND blood_pressure_diastolic <= 200));

-- 2. Add constraints on workout_sets
ALTER TABLE public.workout_sets
ADD CONSTRAINT valid_reps CHECK (reps IS NULL OR (reps >= 0 AND reps <= 1000)),
ADD CONSTRAINT valid_weight CHECK (weight IS NULL OR (weight >= 0 AND weight <= 2000)),
ADD CONSTRAINT valid_set_number CHECK (set_number >= 1 AND set_number <= 100);

-- 3. Add constraints on recipes
ALTER TABLE public.recipes
ADD CONSTRAINT valid_calories CHECK (calories IS NULL OR (calories >= 0 AND calories <= 50000)),
ADD CONSTRAINT valid_protein CHECK (protein IS NULL OR (protein >= 0 AND protein <= 5000)),
ADD CONSTRAINT valid_carbs CHECK (carbs IS NULL OR (carbs >= 0 AND carbs <= 5000)),
ADD CONSTRAINT valid_fats CHECK (fats IS NULL OR (fats >= 0 AND fats <= 5000)),
ADD CONSTRAINT valid_title_length CHECK (LENGTH(title) <= 500);

-- 4. Add text length constraints on messages
ALTER TABLE public.messages
ADD CONSTRAINT valid_body_length CHECK (body IS NULL OR LENGTH(body) <= 10000);

-- 5. Add constraints on profiles
ALTER TABLE public.profiles
ADD CONSTRAINT valid_name_length CHECK (LENGTH(name) <= 200),
ADD CONSTRAINT valid_email_length CHECK (LENGTH(email) <= 500);

-- 6. Harden handle_new_user with input sanitization
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _coach_id uuid;
  _name text;
  _email text;
BEGIN
  -- Sanitize inputs
  _name := COALESCE(TRIM(NEW.raw_user_meta_data->>'name'), '');
  IF LENGTH(_name) > 200 THEN
    _name := SUBSTRING(_name, 1, 200);
  END IF;
  
  _email := COALESCE(TRIM(NEW.email), '');
  IF LENGTH(_email) > 500 THEN
    _email := SUBSTRING(_email, 1, 500);
  END IF;

  IF _email = 'larry92roche@gmail.com' THEN
    INSERT INTO public.profiles (id, name, email, role, status)
    VALUES (
      NEW.id,
      _name,
      _email,
      'coach'::app_role,
      'active'
    );
  ELSE
    SELECT id INTO _coach_id FROM public.profiles WHERE email = 'larry92roche@gmail.com' AND role = 'coach' LIMIT 1;
    
    INSERT INTO public.profiles (id, name, email, role, coach_id, status)
    VALUES (
      NEW.id,
      _name,
      _email,
      'client'::app_role,
      _coach_id,
      'active'
    );
  END IF;
  RETURN NEW;
END;
$function$;
