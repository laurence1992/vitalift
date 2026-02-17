
-- Add missing columns to health_entries for the unified progress dashboard
ALTER TABLE public.health_entries
ADD COLUMN IF NOT EXISTS body_fat numeric,
ADD COLUMN IF NOT EXISTS blood_pressure_systolic integer,
ADD COLUMN IF NOT EXISTS blood_pressure_diastolic integer;
