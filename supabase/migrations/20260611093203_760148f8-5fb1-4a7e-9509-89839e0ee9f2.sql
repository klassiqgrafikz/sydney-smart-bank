
REVOKE EXECUTE ON FUNCTION public.lookup_account_by_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_account_by_number(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.adjust_own_balance(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM PUBLIC, anon, authenticated;
