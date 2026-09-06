
CREATE OR REPLACE FUNCTION public.credit_account_by_number(
  _account_number text,
  _amount numeric,
  _sender_name text,
  _description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  tx_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT id INTO recipient_id
    FROM public.profiles
   WHERE account_number = _account_number
   LIMIT 1;

  IF recipient_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET balance = COALESCE(balance, 0) + _amount
   WHERE id = recipient_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions (user_id, sender_name, receiver_name, amount, transaction_type, description)
  VALUES (
    recipient_id,
    _sender_name,
    (SELECT trim(both ' ' from coalesce(first_name,'') || ' ' || coalesce(last_name,'')) FROM public.profiles WHERE id = recipient_id),
    _amount,
    'receive',
    _description
  )
  RETURNING id INTO tx_id;

  RETURN tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_account_by_number(text, numeric, text, text) TO authenticated;
