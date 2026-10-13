-- Covered countries become rows with a confirmed flag: only confirmed ones are ever shown.
create table service_countries (
  service_id uuid not null references services (id) on delete cascade,
  country char(2) not null,
  confirmed boolean not null default false,
  source text not null check (source like 'https://%'),
  primary key (service_id, country)
);

-- Candidates from the sources consulted on 2026-10-13, all waiting for a human confirmation.
insert into service_countries (service_id, country, source)
select services.id, candidate.country, candidate.source
from services
join (values
  ('wave', 'SN', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('wave', 'CI', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('wave', 'ML', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('wave', 'BF', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('wave', 'UG', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('wave', 'GM', 'https://apps.apple.com/sn/app/wave-mobile-money/id1523884528'),
  ('pi-spi', 'BJ', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'BF', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'CI', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'GW', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'ML', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'NE', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'SN', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('pi-spi', 'TG', 'https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi'),
  ('cinetpay', 'CI', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'SN', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'TG', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'BJ', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'ML', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'CM', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'GN', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'BF', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('cinetpay', 'CG', 'https://docs.cinetpay.com/api/1.0-fr/introduction/overview'),
  ('paydunya', 'SN', 'https://developers.paydunya.com/'),
  ('paydunya', 'BJ', 'https://developers.paydunya.com/'),
  ('paydunya', 'CI', 'https://developers.paydunya.com/'),
  ('paydunya', 'TG', 'https://developers.paydunya.com/'),
  ('paydunya', 'ML', 'https://developers.paydunya.com/'),
  ('paydunya', 'BF', 'https://developers.paydunya.com/'),
  ('paydunya', 'CM', 'https://developers.paydunya.com/'),
  ('orange-money', 'ML', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'CM', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'CI', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'SN', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'MG', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'BW', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'GN', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'GW', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'SL', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'CD', 'https://developer.orange.com/apis/om-webpay'),
  ('orange-money', 'CF', 'https://developer.orange.com/apis/om-webpay'),
  ('moov-money', 'CI', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'BJ', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'TG', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'NE', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'BF', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'ML', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'TD', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'GA', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'CF', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf'),
  ('moov-money', 'MR', 'https://media.casablanca-bourse.com/sites/default/files/2026-02/maroc_telecom_2025.pdf')
) as candidate (slug, country, source) on candidate.slug = services.slug;

alter table services drop column countries;
