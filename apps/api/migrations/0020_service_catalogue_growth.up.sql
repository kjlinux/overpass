-- Catalogue growth: SMS, USSD and English-speaking payment operators, none simulated yet.
insert into services (slug, name, category, simulated) values
  ('mtn-momo', 'MTN MoMo', 'payment', false),
  ('airtel-money', 'Airtel Money', 'payment', false),
  ('m-pesa', 'M-Pesa', 'payment', false),
  ('paystack', 'Paystack', 'payment', false),
  ('flutterwave', 'Flutterwave', 'payment', false),
  ('orange-sms', 'Orange SMS', 'sms', false),
  ('africas-talking-sms', 'Africa''s Talking SMS', 'sms', false),
  ('termii', 'Termii', 'sms', false),
  ('africas-talking-ussd', 'Africa''s Talking USSD', 'ussd', false);

-- Candidates from the developer portals consulted on 2026-10-23.
insert into service_countries (service_id, country, source, consulted_on)
select services.id, candidate.country, candidate.source, date '2026-10-23'
from services
join (values
  ('mtn-momo', 'BJ', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'CM', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'CG', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'CI', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'GH', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'GN', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'LR', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'RW', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'UG', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'ZM', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'SZ', 'https://momodeveloper.mtn.com/'),
  ('mtn-momo', 'SS', 'https://momodeveloper.mtn.com/'),
  ('airtel-money', 'KE', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'UG', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'TZ', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'RW', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'ZM', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'MW', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'NG', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'CD', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'CG', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'GA', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'TD', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'NE', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'MG', 'https://developers.airtel.africa/home'),
  ('airtel-money', 'SC', 'https://developers.airtel.africa/home'),
  ('m-pesa', 'KE', 'https://developer.safaricom.co.ke/'),
  ('m-pesa', 'TZ', 'https://openapiportal.m-pesa.com/'),
  ('m-pesa', 'MZ', 'https://openapiportal.m-pesa.com/'),
  ('m-pesa', 'CD', 'https://openapiportal.m-pesa.com/'),
  ('m-pesa', 'LS', 'https://openapiportal.m-pesa.com/'),
  ('paystack', 'NG', 'https://paystack.com/'),
  ('paystack', 'GH', 'https://paystack.com/'),
  ('paystack', 'ZA', 'https://paystack.com/'),
  ('paystack', 'KE', 'https://paystack.com/'),
  ('paystack', 'CI', 'https://paystack.com/'),
  ('paystack', 'EG', 'https://paystack.com/'),
  ('paystack', 'RW', 'https://paystack.com/'),
  ('flutterwave', 'NG', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'GH', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'KE', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'UG', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'TZ', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'RW', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'ZA', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'CI', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'CM', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'SN', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'EG', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'MW', 'https://developer.flutterwave.com/llms.txt'),
  ('flutterwave', 'ZM', 'https://developer.flutterwave.com/llms.txt'),
  ('orange-sms', 'BW', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'BF', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'CM', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'CD', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'CI', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'GW', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'GN', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'LR', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'MG', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'ML', 'https://developer.orange.com/apis/sms'),
  ('orange-sms', 'SN', 'https://developer.orange.com/apis/sms'),
  ('africas-talking-sms', 'KE', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'UG', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'TZ', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'RW', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'MW', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'NG', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'ZA', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'ET', 'https://developers.africastalking.com/'),
  ('africas-talking-sms', 'ZM', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'KE', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'UG', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'TZ', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'RW', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'MW', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'NG', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'ZA', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'ET', 'https://developers.africastalking.com/'),
  ('africas-talking-ussd', 'ZM', 'https://developers.africastalking.com/'),
  ('termii', 'NG', 'https://developers.termii.com/'),
  ('termii', 'GH', 'https://developers.termii.com/'),
  ('termii', 'KE', 'https://developers.termii.com/')
) as candidate (slug, country, source) on candidate.slug = services.slug;

-- Confirmed on 2026-10-23 only where the portal itself listed the country; members confirm the rest.
-- Airtel: the 13 operating companies of its developer portal. Paystack: its country selector and
-- pricing pages. Flutterwave: the collection methods of its documentation index. Africa's Talking:
-- only Kenya is named in its SMS documentation. MTN MoMo and Vodacom M-Pesa name no market publicly.
update service_countries set confirmed = true, confirmed_at = timestamptz '2026-10-23 12:00:00+00'
where service_id = (select id from services where slug = 'orange-sms')
   or (service_id = (select id from services where slug = 'm-pesa') and country = 'KE')
   or (service_id = (select id from services where slug = 'termii') and country = 'NG')
   or (service_id = (select id from services where slug = 'airtel-money') and country <> 'NG')
   or (service_id = (select id from services where slug = 'paystack'))
   or (service_id = (select id from services where slug = 'flutterwave')
       and country in ('NG', 'GH', 'KE', 'RW', 'TZ', 'UG', 'ZM', 'ZA'))
   or (service_id = (select id from services where slug = 'africas-talking-sms') and country = 'KE');
