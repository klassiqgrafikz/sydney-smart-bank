
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS support_chat_script text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.transfer_restrictions (
  account_number text PRIMARY KEY,
  restore_date date NOT NULL,
  message text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transfer_restrictions TO authenticated;
GRANT ALL ON public.transfer_restrictions TO service_role;

ALTER TABLE public.transfer_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own restriction"
  ON public.transfer_restrictions
  FOR SELECT
  TO authenticated
  USING (
    account_number = (SELECT account_number FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_transfer_restrictions_updated_at
  BEFORE UPDATE ON public.transfer_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
