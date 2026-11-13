-- Disabled reservations only. Enabling a provider requires a separate reviewed migration.
create table public.payment_attempts (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.customer_orders(id),
 idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
 status text not null default 'not_configured' check (status = 'not_configured'),
 created_at timestamptz not null default now(),
 unique(order_id,idempotency_key)
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null check (length(provider) between 1 and 64),
 event_id text not null check (length(event_id) between 1 and 255),
 transaction_id text not null check (length(transaction_id) between 1 and 255),
 order_id uuid not null references public.customer_orders(id),
 amount_minor bigint not null check (amount_minor between 0 and 9007199254740991),
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 status text not null default 'not_configured' check (status = 'not_configured'),
 created_at timestamptz not null default now(),
 unique(provider,event_id)
);
create table public.payment_refunds (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.customer_orders(id),
 amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
 idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
 status text not null default 'not_configured' check (status = 'not_configured'),
 created_at timestamptz not null default now(),
 unique(order_id,idempotency_key)
);
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_refunds enable row level security;
revoke all on public.payment_attempts,public.payment_events,public.payment_refunds from public,anon,authenticated,service_role;
-- Reserved for trusted server storage, never browser JWTs. No runtime writer exists this cycle.
grant select,insert on public.payment_attempts,public.payment_events,public.payment_refunds to service_role;
