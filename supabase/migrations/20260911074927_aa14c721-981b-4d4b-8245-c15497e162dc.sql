CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  institution TEXT,
  course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  theme TEXT NOT NULL,
  title TEXT NOT NULL,
  work_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  student_name TEXT,
  student_number TEXT,
  course TEXT,
  class_group TEXT,
  grade_year TEXT,
  institution TEXT,
  faculty TEXT,
  department TEXT,
  subject TEXT,
  teacher TEXT,
  city TEXT,
  country TEXT,
  due_date DATE,
  pages INT NOT NULL DEFAULT 10,
  language TEXT NOT NULL DEFAULT 'Português',
  academic_level TEXT,
  norms TEXT NOT NULL DEFAULT 'APA',
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  download_count INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.works TO authenticated;
GRANT SELECT ON public.works TO anon;
GRANT ALL ON public.works TO service_role;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own works" ON public.works FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public shared works" ON public.works FOR SELECT TO anon USING (is_public = true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER works_updated_at BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();