
-- ==========================================
-- EXERCISE LIBRARY (coach-managed)
-- ==========================================
CREATE TABLE public.coach_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  image_url text,
  video_url text,
  notes text,
  category text DEFAULT '',
  muscle_group text DEFAULT '',
  equipment text DEFAULT '',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own exercises" ON public.coach_exercises FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Clients read coach exercises" ON public.coach_exercises FOR SELECT
  USING (coach_id = get_user_coach_id(auth.uid()));

-- ==========================================
-- PROGRAMS
-- ==========================================
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own programs" ON public.programs FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- ==========================================
-- CLIENT PROGRAM ASSIGNMENTS (created before program RLS that references it)
-- ==========================================
CREATE TABLE public.client_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  program_id uuid NOT NULL REFERENCES public.programs(id),
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_program_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage assignments for their clients" ON public.client_program_assignments FOR ALL
  USING (client_id IN (SELECT id FROM public.profiles WHERE coach_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.profiles WHERE coach_id = auth.uid()));

CREATE POLICY "Clients read own assignments" ON public.client_program_assignments FOR SELECT
  USING (client_id = auth.uid());

-- Now add client read policy on programs
CREATE POLICY "Clients read assigned programs" ON public.programs FOR SELECT
  USING (id IN (
    SELECT program_id FROM public.client_program_assignments
    WHERE client_id = auth.uid() AND is_active = true
  ));

-- ==========================================
-- PROGRAM DAYS
-- ==========================================
CREATE TABLE public.program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Day 1',
  sort_order integer NOT NULL DEFAULT 0,
  day_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage program days" ON public.program_days FOR ALL
  USING (program_id IN (SELECT id FROM public.programs WHERE coach_id = auth.uid()))
  WITH CHECK (program_id IN (SELECT id FROM public.programs WHERE coach_id = auth.uid()));

CREATE POLICY "Clients read assigned program days" ON public.program_days FOR SELECT
  USING (program_id IN (
    SELECT program_id FROM public.client_program_assignments
    WHERE client_id = auth.uid() AND is_active = true
  ));

-- ==========================================
-- PROGRAM EXERCISES
-- ==========================================
CREATE TABLE public.program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.coach_exercises(id),
  sort_order integer NOT NULL DEFAULT 0,
  target_sets integer NOT NULL DEFAULT 3,
  target_reps text DEFAULT '8-12',
  target_weight numeric,
  rest_seconds integer,
  coach_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage program exercises" ON public.program_exercises FOR ALL
  USING (program_day_id IN (
    SELECT pd.id FROM public.program_days pd
    JOIN public.programs p ON pd.program_id = p.id
    WHERE p.coach_id = auth.uid()
  ))
  WITH CHECK (program_day_id IN (
    SELECT pd.id FROM public.program_days pd
    JOIN public.programs p ON pd.program_id = p.id
    WHERE p.coach_id = auth.uid()
  ));

CREATE POLICY "Clients read assigned program exercises" ON public.program_exercises FOR SELECT
  USING (program_day_id IN (
    SELECT pd.id FROM public.program_days pd
    WHERE pd.program_id IN (
      SELECT program_id FROM public.client_program_assignments
      WHERE client_id = auth.uid() AND is_active = true
    )
  ));

-- ==========================================
-- PROGRAM EXERCISE SETS (per-set coach notes + targets)
-- ==========================================
CREATE TABLE public.program_exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_exercise_id uuid NOT NULL REFERENCES public.program_exercises(id) ON DELETE CASCADE,
  set_index integer NOT NULL DEFAULT 1,
  target_reps text,
  target_weight numeric,
  rest_seconds integer,
  coach_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.program_exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage program exercise sets" ON public.program_exercise_sets FOR ALL
  USING (program_exercise_id IN (
    SELECT pe.id FROM public.program_exercises pe
    JOIN public.program_days pd ON pe.program_day_id = pd.id
    JOIN public.programs p ON pd.program_id = p.id
    WHERE p.coach_id = auth.uid()
  ))
  WITH CHECK (program_exercise_id IN (
    SELECT pe.id FROM public.program_exercises pe
    JOIN public.program_days pd ON pe.program_day_id = pd.id
    JOIN public.programs p ON pd.program_id = p.id
    WHERE p.coach_id = auth.uid()
  ));

CREATE POLICY "Clients read assigned program exercise sets" ON public.program_exercise_sets FOR SELECT
  USING (program_exercise_id IN (
    SELECT pe.id FROM public.program_exercises pe
    JOIN public.program_days pd ON pe.program_day_id = pd.id
    WHERE pd.program_id IN (
      SELECT program_id FROM public.client_program_assignments
      WHERE client_id = auth.uid() AND is_active = true
    )
  ));
