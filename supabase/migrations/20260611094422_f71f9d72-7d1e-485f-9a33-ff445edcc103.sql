
CREATE OR REPLACE FUNCTION public.admin_reset_user_by_account(_account_number text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  target_id uuid;
  target_name text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT p.id, trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))
    INTO target_id, target_name
    FROM public.profiles p
   WHERE p.account_number = _account_number
   LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No account found with that number';
  END IF;

  DELETE FROM public.transactions WHERE user_id = target_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET balance = 0 WHERE id = target_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.audit_logs (actor_id, target_user_id, action, details)
  VALUES (caller, target_id, 'reset_user_balance_and_history', jsonb_build_object('account_number', _account_number));

  RETURN QUERY SELECT target_id, target_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_by_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_by_account(text) TO authenticated;
