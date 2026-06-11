-- Revoke broad EXECUTE from anon/public on SECURITY DEFINER RPCs; grant only to authenticated.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.has_role(uuid, app_role)',
    'public.lookup_account_by_number(text)',
    'public.adjust_own_balance(numeric)',
    'public.execute_withdrawal(numeric, text)',
    'public.admin_reset_user_by_account(text)',
    'public.credit_account_by_number(text, numeric, text, text)',
    'public.admin_reset_user(uuid)',
    'public.execute_transfer(text, numeric, text, text)',
    'public.generate_account_number()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;