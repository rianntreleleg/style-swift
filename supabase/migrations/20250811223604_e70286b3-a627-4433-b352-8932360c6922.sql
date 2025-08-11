-- Auto BarberSalon initial schema (multi-tenant)
-- Enable extensions needed
create extension if not exists pgcrypto;

-- Tenants (establishments)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text not null unique,
  logo_url text,
  theme_variant text not null default 'barber' check (theme_variant in ('barber','salon')),
  plan text not null default 'free' check (plan in ('free','pro','plus')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Services offered by a tenant
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 8*60),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_tenant on public.services(tenant_id);

-- Professionals (staff) for a tenant
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  bio text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_professionals_tenant on public.professionals(tenant_id);

-- Customers per tenant
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  contact text not null,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, contact)
);
create index if not exists idx_customers_tenant on public.customers(tenant_id);

-- Business hours per weekday (0=Sunday..6=Saturday)
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, weekday)
);
create index if not exists idx_business_hours_tenant on public.business_hours(tenant_id);

-- Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_contact text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_time_valid check (end_time > start_time)
);
create index if not exists idx_appointments_tenant_time on public.appointments(tenant_id, start_time);
create index if not exists idx_appointments_professional_time on public.appointments(professional_id, start_time);

-- Notifications (reminders etc.)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  type text not null check (type in ('reminder','confirmation')),
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notifications_tenant on public.notifications(tenant_id);

-- Helper function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
create trigger trg_tenants_updated before update on public.tenants for each row execute function public.update_updated_at_column();
create trigger trg_services_updated before update on public.services for each row execute function public.update_updated_at_column();
create trigger trg_professionals_updated before update on public.professionals for each row execute function public.update_updated_at_column();
create trigger trg_customers_updated before update on public.customers for each row execute function public.update_updated_at_column();
create trigger trg_business_hours_updated before update on public.business_hours for each row execute function public.update_updated_at_column();
create trigger trg_appointments_updated before update on public.appointments for each row execute function public.update_updated_at_column();
create trigger trg_notifications_updated before update on public.notifications for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.customers enable row level security;
alter table public.business_hours enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;

-- Policies
-- Tenants: owner can do everything; public can read by slug (for booking)
create policy "Owner can manage their tenant" on public.tenants
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Public can view tenants" on public.tenants
for select using (true);

-- Services
create policy "Owner manage services" on public.services
for all using (exists (select 1 from public.tenants t where t.id = services.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = services.tenant_id and t.owner_id = auth.uid()));

create policy "Public can view services" on public.services
for select using (true);

-- Professionals
create policy "Owner manage professionals" on public.professionals
for all using (exists (select 1 from public.tenants t where t.id = professionals.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = professionals.tenant_id and t.owner_id = auth.uid()));

create policy "Public can view professionals" on public.professionals
for select using (true);

-- Customers
create policy "Owner manage customers" on public.customers
for all using (exists (select 1 from public.tenants t where t.id = customers.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = customers.tenant_id and t.owner_id = auth.uid()));

create policy "Public can insert customers" on public.customers
for insert with check (true);

-- Business hours
create policy "Owner manage business hours" on public.business_hours
for all using (exists (select 1 from public.tenants t where t.id = business_hours.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = business_hours.tenant_id and t.owner_id = auth.uid()));

create policy "Public can view business hours" on public.business_hours
for select using (true);

-- Appointments
create policy "Owner manage appointments" on public.appointments
for all using (exists (select 1 from public.tenants t where t.id = appointments.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = appointments.tenant_id and t.owner_id = auth.uid()));

create policy "Public can create appointments" on public.appointments
for insert with check (true);

create policy "Public can view appointments by tenant (read-only)" on public.appointments
for select using (true);

-- Notifications (owner manage only)
create policy "Owner manage notifications" on public.notifications
for all using (exists (select 1 from public.tenants t where t.id = notifications.tenant_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = notifications.tenant_id and t.owner_id = auth.uid()));

-- Helpful indexes
create index if not exists idx_tenants_slug on public.tenants(slug);
