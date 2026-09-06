
DROP FUNCTION IF EXISTS public.execute_transfer(text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.execute_transfer(
  _recipient_account text,
  _amount numeric,
  _description text,
  _reference text DEFAULT NULL,
  _occurred_at timestamptz DEFAULT NULL
)
RETURNS TABLE(sender_tx_id uuid, recipient_tx_id uuid, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  sender_name text;
  recipient_id uuid;
  recipient_name text;
  s_balance numeric;
  s_tx uuid;
  r_tx uuid;
  ts timestamptz := COALESCE(_occurred_at, now());
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF _recipient_account IS NULL OR length(trim(_recipient_account)) = 0 THEN
    RAISE EXCEPTION 'Recipient account required';
  END IF;

  SELECT trim(both ' ' from coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    INTO sender_name FROM public.profiles WHERE id = caller;

  SELECT id, trim(both ' ' from coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    INTO recipient_id, recipient_name
    FROM public.profiles WHERE account_number = _recipient_account LIMIT 1;
  IF recipient_id IS NULL THEN RAISE EXCEPTION 'Recipient account not found'; END IF;
  IF recipient_id = caller THEN RAISE EXCEPTION 'Cannot transfer to yourself'; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET balance = COALESCE(balance,0) - _amount
   WHERE id = caller AND COALESCE(balance,0) >= _amount
  RETURNING balance INTO s_balance;
  IF s_balance IS NULL THEN
    PERFORM set_config('app.bypass_profile_guard', 'off', true);
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  UPDATE public.profiles SET balance = COALESCE(balance,0) + _amount WHERE id = recipient_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions (user_id, sender_name, receiver_name, amount, transaction_type, description, created_at)
  VALUES (caller, sender_name, recipient_name, _amount, 'send', _description, ts) RETURNING id INTO s_tx;

  INSERT INTO public.transactions (user_id, sender_name, receiver_name, amount, transaction_type, description, created_at)
  VALUES (recipient_id, sender_name, recipient_name, _amount,'receive',
          coalesce('Transfer received — ' || nullif(_reference,''), 'Transfer received'), ts)
  RETURNING id INTO r_tx;

  RETURN QUERY SELECT s_tx, r_tx, s_balance;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.execute_transfer(text, numeric, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_transfer(text, numeric, text, text, timestamptz) TO authenticated, service_role;
