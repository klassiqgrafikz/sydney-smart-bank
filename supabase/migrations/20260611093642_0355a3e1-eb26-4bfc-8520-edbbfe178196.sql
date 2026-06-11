
CREATE OR REPLACE FUNCTION public.admin_reset_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user required';
  END IF;

  DELETE FROM public.transactions WHERE user_id = _target_user_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET balance = 0 WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.audit_logs (actor_id, target_user_id, action)
  VALUES (caller, _target_user_id, 'reset_user_balance_and_history');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user(uuid) TO authenticated;
