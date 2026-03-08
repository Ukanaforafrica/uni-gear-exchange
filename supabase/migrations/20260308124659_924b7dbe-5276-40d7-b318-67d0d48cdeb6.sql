
-- Drop and recreate the trigger to ensure it's correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing user who is missing one
INSERT INTO public.profiles (id, full_name, university)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', ''), COALESCE(raw_user_meta_data->>'university', 'UNIBEN')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
