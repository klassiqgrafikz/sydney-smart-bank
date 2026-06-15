DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users insert own transfers" ON public.transfers;
REVOKE INSERT ON public.transactions FROM authenticated;
REVOKE INSERT ON public.transfers FROM authenticated;