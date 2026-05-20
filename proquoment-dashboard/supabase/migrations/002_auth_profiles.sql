-- ============================================================
-- Proquoment — Auth Profiles Table
-- Run AFTER 001_schema.sql in the Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/jpsifaqpodwijvgfqfok/sql/new
-- ============================================================

DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  email      TEXT,
  company    TEXT,
  type       TEXT DEFAULT 'Supplier',
  role       TEXT DEFAULT 'Owner',
  industry   TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS so anon key has full access (consistent with other tables)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ── Auto-create profile row when a new user signs up ──────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, company, type, role, industry, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'company',
    COALESCE(NEW.raw_user_meta_data->>'type', 'Supplier'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Owner'),
    NEW.raw_user_meta_data->>'industry',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Update updated_at automatically ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
