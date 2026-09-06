
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  bank_name TEXT NOT NULL DEFAULT 'Bank of Sydney',
  tagline TEXT NOT NULL DEFAULT 'Banking, reimagined',
  support_email TEXT NOT NULL DEFAULT 'support@bankofsydney.com',
  support_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_data_url TEXT,
  mark_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 'singleton')
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING;
