
REVOKE ALL ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.adjust_own_balance(delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  new_balance numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF delta IS NULL OR delta = 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF delta > 0 THEN RAISE EXCEPTION 'Self-credit not allowed'; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET balance = COALESCE(balance, 0) + delta
   WHERE id = uid
     AND COALESCE(balance, 0) + delta >= 0
  RETURNING balance INTO new_balance;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  IF new_balance IS NULL THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  RETURN new_balance;
END;
$function$;
REVOKE ALL ON FUNCTION public.adjust_own_balance(numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_own_balance(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_account_by_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_by_account(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_withdrawal(numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_transfer(text, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_fund_account_by_number(uuid, text, numeric, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_sensitive_profile_updates() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
