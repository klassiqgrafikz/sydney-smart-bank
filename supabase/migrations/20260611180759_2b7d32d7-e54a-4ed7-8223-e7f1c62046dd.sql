REVOKE EXECUTE ON FUNCTION public.adjust_own_balance(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) TO service_role;