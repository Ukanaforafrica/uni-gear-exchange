
-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  university TEXT NOT NULL DEFAULT 'UNIBEN',
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, university, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'university', 'UNIBEN'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create item_requests table
CREATE TABLE IF NOT EXISTS public.item_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  budget_min INTEGER NOT NULL DEFAULT 0,
  budget_max INTEGER NOT NULL DEFAULT 0,
  university TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests from same university" ON public.item_requests
  FOR SELECT TO authenticated
  USING (university = (SELECT university FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own requests" ON public.item_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON public.item_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER item_requests_updated_at
  BEFORE UPDATE ON public.item_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create items (listings) table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  negotiable BOOLEAN NOT NULL DEFAULT false,
  condition TEXT NOT NULL DEFAULT 'Good',
  usage_duration TEXT NOT NULL DEFAULT '',
  defects TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  university TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  listed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  relist_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items from same university" ON public.items
  FOR SELECT TO authenticated
  USING (
    university = (SELECT university FROM public.profiles WHERE id = auth.uid())
    AND status = 'active'
    AND expires_at > now()
  );

CREATE POLICY "Users can view own items regardless" ON public.items
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items" ON public.items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON public.items
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('item-photos', 'item-photos', true, 5242880);

-- Storage policies
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos');

CREATE POLICY "Anyone can view item photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'item-photos');

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
