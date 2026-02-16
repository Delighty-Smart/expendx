-- Create admin_banners table
CREATE TABLE IF NOT EXISTS public.admin_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner', 'popup')),
  content_type TEXT CHECK (content_type IN ('text', 'image', 'mixed')),
  message TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_link TEXT,
  is_active BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_banners ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admin: ALL access
CREATE POLICY "Admins can do everything with banners" ON public.admin_banners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Authenticated Users: SELECT only active banners
CREATE POLICY "Users can view active banners" ON public.admin_banners
  FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

-- Realtime
alter publication supabase_realtime add table public.admin_banners;
