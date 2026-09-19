create table if not exists public.finance_profiles (
  id uuid primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  mode text not null check (mode in ('demo','live')),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key,
  profile_id uuid not null references public.finance_profiles(id) on delete cascade,
  source text not null,
  external_id text not null,
  occurred_at timestamptz not null,
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'ARS',
  direction text not null check (direction in ('income','expense')),
  merchant text,
  description text,
  category text,
  status text not null default 'settled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, source, external_id)
);

create table if not exists public.finance_sync_state (
  profile_id uuid not null references public.finance_profiles(id) on delete cascade,
  provider text not null,
  status text not null default 'idle',
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  cursor jsonb not null default '{}'::jsonb,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key(profile_id, provider)
);

alter table public.finance_profiles enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_sync_state enable row level security;

revoke all on public.finance_profiles from anon, authenticated;
revoke all on public.finance_transactions from anon, authenticated;
revoke all on public.finance_sync_state from anon, authenticated;

grant all on public.finance_profiles to service_role;
grant all on public.finance_transactions to service_role;
grant all on public.finance_sync_state to service_role;

create index if not exists finance_transactions_profile_occurred_idx
  on public.finance_transactions(profile_id, occurred_at);
create index if not exists finance_transactions_profile_category_occurred_idx
  on public.finance_transactions(profile_id, category, occurred_at);

insert into public.finance_profiles(id, auth_user_id, mode, label)
values ('00000000-0000-4000-8000-000000000001', null, 'demo', 'synthetic-v1')
on conflict (id) do nothing;

insert into public.finance_sync_state(profile_id, provider, status, last_success_at, last_attempt_at)
values ('00000000-0000-4000-8000-000000000001', 'synthetic', 'ok', now(), now())
on conflict (profile_id, provider) do update
set status='ok', last_success_at=excluded.last_success_at,
    last_attempt_at=excluded.last_attempt_at, updated_at=now();

insert into public.finance_transactions(id, profile_id, source, external_id, occurred_at, amount, currency, direction, merchant, description, category, status)
values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','synthetic','syn-20260901-01','2026-09-01 09:10:00-03',850.00,'ARS','expense','Transporte Demo','Viaje de prueba','transport','settled'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','synthetic','syn-20260901-02','2026-09-01 18:00:00-03',50000.00,'ARS','income','Ingreso Demo','Ingreso sintético','classes','settled'),
('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','synthetic','syn-20260902-01','2026-09-02 12:20:00-03',12800.00,'ARS','expense','Supermercado Demo','Compra sintética','supermarket','settled'),
('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','synthetic','syn-20260903-01','2026-09-03 10:05:00-03',4200.00,'ARS','expense','Café Demo','Consumo sintético','food','settled'),
('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','synthetic','syn-20260903-02','2026-09-03 19:00:00-03',50000.00,'ARS','income','Ingreso Demo','Ingreso sintético','classes','settled'),
('10000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','synthetic','syn-20260904-01','2026-09-04 16:40:00-03',7600.00,'ARS','expense','Farmacia Demo','Compra sintética','health','settled'),
('10000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001','synthetic','syn-20260905-01','2026-09-05 13:15:00-03',19600.00,'ARS','expense','Supermercado Demo','Compra sintética','supermarket','settled'),
('10000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000001','synthetic','syn-20260905-02','2026-09-05 18:10:00-03',3800.00,'ARS','expense','Café Demo','Consumo sintético','food','settled'),
('10000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000001','synthetic','syn-20260906-01','2026-09-06 11:05:00-03',1500.00,'ARS','expense','Transporte Demo','Viaje de prueba','transport','settled'),
('10000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','synthetic','syn-20260907-01','2026-09-07 09:18:00-03',750.00,'ARS','expense','Transporte Demo','Viaje de prueba','transport','settled'),
('10000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','synthetic','syn-20260907-02','2026-09-07 11:43:00-03',3200.00,'ARS','expense','Café Demo','Consumo sintético','food','settled'),
('10000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001','synthetic','syn-20260907-03','2026-09-07 13:12:00-03',18900.00,'ARS','expense','Supermercado Demo','Compra sintética','supermarket','settled'),
('10000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','synthetic','syn-20260907-04','2026-09-07 18:00:00-03',50000.00,'ARS','income','Ingreso Demo','Ingreso sintético','classes','settled')
on conflict (profile_id, source, external_id) do nothing;
