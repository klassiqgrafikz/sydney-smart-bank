
-- Revoke public/anon EXECUTE on SECURITY DEFINER functions exposed via the API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.lookup_account_by_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_account_by_number(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_by_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_by_account(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.execute_withdrawal(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_withdrawal(numeric, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.execute_transfer(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_transfer(text, numeric, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.adjust_own_balance(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_own_balance(numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_fund_account_by_number(uuid, text, numeric, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_fund_account_by_number(uuid, text, numeric, text, timestamptz) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_account_number() TO service_role;
