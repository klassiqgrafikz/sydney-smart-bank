
CREATE OR REPLACE FUNCTION public.lookup_account_by_number(_account_number text)
RETURNS TABLE (account_number text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.account_number,
         trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) AS full_name
    FROM public.profiles p
   WHERE p.account_number = _account_number
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.lookup_account_by_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_account_by_number(text) TO authenticated;
