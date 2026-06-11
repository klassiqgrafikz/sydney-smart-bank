
-- Allow trigger bypass via session-local GUC for trusted SECURITY DEFINER funcs
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_profile_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.account_number IS DISTINCT FROM OLD.account_number
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Not allowed to modify protected profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Self-service balance adjustment for the authenticated user.
-- Positive delta = credit, negative delta = debit. Prevents negative balance.
CREATE OR REPLACE FUNCTION public.adjust_own_balance(delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  new_balance numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF delta IS NULL OR delta = 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
     SET balance = COALESCE(balance, 0) + delta
   WHERE id = uid
     AND COALESCE(balance, 0) + delta >= 0
  RETURNING balance INTO new_balance;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_own_balance(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO authenticated;
