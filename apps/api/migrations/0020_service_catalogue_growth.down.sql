-- Content written for these services goes with them: routes cascade to their versions and checks,
-- threads only lose the service tag. Rolling back a catalogue migration is a development operation.
delete from routes where service_id in (
  select id from services where slug in (
    'mtn-momo', 'airtel-money', 'm-pesa', 'paystack', 'flutterwave',
    'orange-sms', 'africas-talking-sms', 'termii', 'africas-talking-ussd'
  )
);

update threads set service_id = null where service_id in (
  select id from services where slug in (
    'mtn-momo', 'airtel-money', 'm-pesa', 'paystack', 'flutterwave',
    'orange-sms', 'africas-talking-sms', 'termii', 'africas-talking-ussd'
  )
);

delete from services where slug in (
  'mtn-momo', 'airtel-money', 'm-pesa', 'paystack', 'flutterwave',
  'orange-sms', 'africas-talking-sms', 'termii', 'africas-talking-ussd'
);
