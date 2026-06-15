ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS theme_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb NOT NULL DEFAULT '{}'::jsonb;