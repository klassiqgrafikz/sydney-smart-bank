ALTER TABLE public.transfer_restrictions
  ADD COLUMN IF NOT EXISTS status_text text NOT NULL DEFAULT '';