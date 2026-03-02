
ALTER TABLE public.coach_exercises
ADD COLUMN IF NOT EXISTS work_seconds integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rest_seconds integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rounds integer DEFAULT NULL;
