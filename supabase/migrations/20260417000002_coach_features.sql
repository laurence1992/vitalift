-- Coach Features migration
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Add coach-personal and template flags to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_coach_personal BOOLEAN DEFAULT FALSE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- 2. Nutrition logs table
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  meal_name  TEXT        NOT NULL,
  calories   INTEGER,
  protein_g  NUMERIC(6,1),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nutrition logs"
  ON nutrition_logs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Nutrition targets on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calorie_target INTEGER DEFAULT 2000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_target  INTEGER DEFAULT 150;

-- 4. Progress photos table (if not already present)
CREATE TABLE IF NOT EXISTS progress_photos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  taken_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own progress photos"
  ON progress_photos FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches view client progress photos"
  ON progress_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = progress_photos.client_id
        AND profiles.coach_id = auth.uid()
    )
  );
