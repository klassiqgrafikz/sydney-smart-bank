REVOKE EXECUTE ON FUNCTION public.adjust_own_balance(numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_account_by_number(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_account_by_number(text) TO authenticated;