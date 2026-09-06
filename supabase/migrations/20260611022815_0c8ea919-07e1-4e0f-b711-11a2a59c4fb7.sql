
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS support_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_telegram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_chat_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_message text NOT NULL DEFAULT 'Hi! I need help with my account.';
