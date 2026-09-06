
CREATE OR REPLACE FUNCTION public.admin_fund_account_by_number(
  _caller_id uuid,
  _account_number text,
  _amount numeric,
  _sender_name text,
  _occurred_at timestamptz DEFAULT NULL
)
 RETURNS TABLE(transaction_id uuid, new_balance numeric, holder text, account_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_id uuid;
  target_name text;
  target_acct text;
  new_bal numeric;
  tx uuid;
  ts timestamptz := COALESCE(_occurred_at, now());
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(_caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT p.id,
         trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),
         p.account_number
    INTO target_id, target_name, target_acct
    FROM public.profiles p
   WHERE p.account_number = _account_number
   LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET balance = COALESCE(balance, 0) + _amount
   WHERE id = target_id
  RETURNING balance INTO new_bal;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions (user_id, sender_name, receiver_name, amount, transaction_type, description, status, created_at)
  VALUES (
    target_id,
    _sender_name,
    coalesce(nullif(target_name,''),'Account holder'),
    _amount,
    'credit',
    _sender_name,
    'completed',
    ts
  )
  RETURNING id INTO tx;

  RETURN QUERY SELECT tx, new_bal, target_name, target_acct;
END;
$function$;
