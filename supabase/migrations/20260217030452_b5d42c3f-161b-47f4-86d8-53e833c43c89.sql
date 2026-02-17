
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('coach', 'client');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'client',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_coach_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_id FROM public.profiles WHERE id = _user_id
$$;

-- Profiles RLS: users see own profile, coaches see their clients
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Coaches can view their clients"
  ON public.profiles FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Coaches can insert client profiles (for creating client accounts)
CREATE POLICY "Coaches can update their clients"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid());

-- Auto-create profile on signup
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
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  session_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own workouts"
  ON public.workouts FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coaches see client workouts"
  ON public.workouts FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'coach' AND client_id IN (
    SELECT id FROM public.profiles WHERE coach_id = auth.uid()
  ));

CREATE POLICY "Clients insert own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Workout sets table
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own sets"
  ON public.workout_sets FOR SELECT
  USING (workout_id IN (SELECT id FROM public.workouts WHERE client_id = auth.uid()));

CREATE POLICY "Coaches see client sets"
  ON public.workout_sets FOR SELECT
  USING (workout_id IN (
    SELECT w.id FROM public.workouts w
    JOIN public.profiles p ON w.client_id = p.id
    WHERE p.coach_id = auth.uid()
  ));

CREATE POLICY "Clients insert own sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (workout_id IN (SELECT id FROM public.workouts WHERE client_id = auth.uid()));

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, client_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see conversations"
  ON public.conversations FOR SELECT
  USING (coach_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Coach or client can create conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (coach_id = auth.uid() OR client_id = auth.uid());

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see messages"
  ON public.messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.conversations WHERE coach_id = auth.uid() OR client_id = auth.uid()
  ));

CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations WHERE coach_id = auth.uid() OR client_id = auth.uid()
    )
  );

CREATE POLICY "Recipients mark messages read"
  ON public.messages FOR UPDATE
  USING (
    sender_user_id != auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations WHERE coach_id = auth.uid() OR client_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Progress entries
CREATE TABLE public.progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bodyweight NUMERIC,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own progress"
  ON public.progress_entries FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coaches see client progress"
  ON public.progress_entries FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'coach' AND client_id IN (
    SELECT id FROM public.profiles WHERE coach_id = auth.uid()
  ));

CREATE POLICY "Clients insert own progress"
  ON public.progress_entries FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients update own progress"
  ON public.progress_entries FOR UPDATE
  USING (client_id = auth.uid());

-- Progress photos
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_entry_id UUID NOT NULL REFERENCES public.progress_entries(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  angle TEXT NOT NULL DEFAULT 'other' CHECK (angle IN ('front', 'side', 'back', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own photos"
  ON public.progress_photos FOR SELECT
  USING (progress_entry_id IN (
    SELECT id FROM public.progress_entries WHERE client_id = auth.uid()
  ));

CREATE POLICY "Coaches see client photos"
  ON public.progress_photos FOR SELECT
  USING (progress_entry_id IN (
    SELECT pe.id FROM public.progress_entries pe
    JOIN public.profiles p ON pe.client_id = p.id
    WHERE p.coach_id = auth.uid()
  ));

CREATE POLICY "Clients insert own photos"
  ON public.progress_photos FOR INSERT
  WITH CHECK (progress_entry_id IN (
    SELECT id FROM public.progress_entries WHERE client_id = auth.uid()
  ));

-- Health entries
CREATE TABLE public.health_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER,
  calories_burned INTEGER,
  sleep_hours NUMERIC,
  resting_hr INTEGER,
  caloric_intake INTEGER,
  bodyweight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own health"
  ON public.health_entries FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coaches see client health"
  ON public.health_entries FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'coach' AND client_id IN (
    SELECT id FROM public.profiles WHERE coach_id = auth.uid()
  ));

CREATE POLICY "Clients insert own health"
  ON public.health_entries FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients update own health"
  ON public.health_entries FOR UPDATE
  USING (client_id = auth.uid());

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC,
  ingredients TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view recipes"
  ON public.recipes FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'client' AND coach_id = public.get_user_coach_id(auth.uid())
  );

CREATE POLICY "Coaches can create recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid());

CREATE POLICY "Coaches can update own recipes"
  ON public.recipes FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid());

CREATE POLICY "Coaches can delete own recipes"
  ON public.recipes FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'coach' AND coach_id = auth.uid());

-- Storage buckets for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('media', 'progress-photos', 'recipe-images') AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view public media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('media', 'progress-photos', 'recipe-images'));

CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('media', 'progress-photos', 'recipe-images') AND auth.uid()::text = (storage.foldername(name))[1]);
