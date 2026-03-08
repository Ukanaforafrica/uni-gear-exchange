
-- Allow authenticated users to read any profile's full_name (needed for negotiations)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
