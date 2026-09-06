
-- 1. Wipe all users (cascades to profiles, transactions, user_roles, etc. via FK ON DELETE CASCADE)
DELETE FROM auth.users;

-- Also clear any orphan rows in case some tables don't cascade
TRUNCATE TABLE public.profiles, public.transactions, public.user_roles, public.audit_logs RESTART IDENTITY CASCADE;

-- 2. Password reset codes table
CREATE TABLE public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes (lower(email), created_at DESC);

GRANT ALL ON public.password_reset_codes TO service_role;

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (server functions) can access. anon/authenticated have no grants and no policies = locked.
