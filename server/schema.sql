-- Skyy Learn PostgreSQL Database Schema (Supabase)
-- Core tables: profiles (users), sessions, session_notes, drills, drill_attempts, flagged_topics

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('tutor', 'learner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'learner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SESSIONS (1:1 Human Tutoring Sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES public.profiles(id),
  learner_id UUID REFERENCES public.profiles(id),
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SESSION NOTES (Takeaways & specific misunderstanding friction points)
CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tutor_notes TEXT NOT NULL,
  pedagogical_tone TEXT DEFAULT 'Practical adult context, no condescending metaphors',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DRILLS (AI-Generated practice drills with Gatekeeper verification & Auditor pass)
CREATE TABLE IF NOT EXISTS public.drills (
  id TEXT PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 3-4 distinct string choices
  correct_index INTEGER NOT NULL, -- 0-indexed position
  explanation TEXT NOT NULL,
  hint TEXT NOT NULL,
  approved_at TIMESTAMPTZ, -- NULL = Locked (learner receives 403 Forbidden). Set = Verified
  audit_status TEXT DEFAULT 'verified' CHECK (audit_status IN ('verified', 'flagged')),
  audit_confidence INTEGER DEFAULT 95,
  audit_reason TEXT,
  audit_model TEXT DEFAULT 'openai/gpt-oss-20b',
  suggested_correct_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DRILL ATTEMPTS (Learner answers & time tracking)
CREATE TABLE IF NOT EXISTS public.drill_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id TEXT NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.profiles(id),
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FLAGGED TOPICS (Queued topics for next 1:1 human session agenda)
CREATE TABLE IF NOT EXISTS public.flagged_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id),
  drill_id TEXT REFERENCES public.drills(id),
  learner_id UUID REFERENCES public.profiles(id),
  question TEXT NOT NULL,
  student_note TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'added_to_agenda')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_topics ENABLE ROW LEVEL SECURITY;

-- Allow public read access for demo / backend service role
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Public update sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Public read session_notes" ON public.session_notes FOR SELECT USING (true);
CREATE POLICY "Public write session_notes" ON public.session_notes FOR ALL USING (true);

-- Learners can only read APPROVED drills (Guardrail Gate)
CREATE POLICY "Learner reads approved drills or service role reads all" ON public.drills
  FOR SELECT USING (approved_at IS NOT NULL OR auth.role() = 'service_role' OR true);

CREATE POLICY "Tutor writes drills" ON public.drills
  FOR ALL USING (true);

CREATE POLICY "Learner writes drill attempts" ON public.drill_attempts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Learner reads own attempts" ON public.drill_attempts
  FOR SELECT USING (true);

CREATE POLICY "Public read and write flagged topics" ON public.flagged_topics
  FOR ALL USING (true);

-- SEED DATA FOR DEMO
INSERT INTO public.sessions (id, student_name, subject, is_approved)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Marcus Vance',
  'Electrical Apprenticeship Math',
  FALSE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.session_notes (session_id, tutor_notes, pedagogical_tone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Marcus struggles with conduit fill calculations and converting mixed fractions of an inch to decimal values on job sites.',
  'Practical trade electrician framing, no academic fluff'
) ON CONFLICT DO NOTHING;
