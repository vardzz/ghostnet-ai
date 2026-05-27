create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brand_name text not null,
  official_domain text,
  primary_social_handles jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  last_scan_at timestamptz,
  scan_frequency_minutes integer not null default 1440 check (scan_frequency_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, brand_name)
);

create unique index if not exists brands_tenant_id_id_key on public.brands (tenant_id, id);

create index if not exists idx_brands_tenant_id on public.brands (tenant_id);
create index if not exists idx_brands_brand_name on public.brands (brand_name);
create index if not exists idx_brands_official_domain on public.brands (official_domain);
create index if not exists idx_brands_status_last_scan_at on public.brands (status, last_scan_at);

create table if not exists public.threats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brand_id uuid not null,
  scan_id uuid,
  threat_type text not null check (threat_type in ('typosquat', 'phishing', 'spoofed_social', 'impersonation', 'lookalike_domain', 'benign')),
  target_url text not null,
  observed_domain text,
  raw_title text,
  raw_excerpt text,
  html_snapshot_path text,
  screenshot_path text,
  threat_score numeric(5,2) not null default 0 check (threat_score >= 0 and threat_score <= 100),
  confidence_score numeric(4,3) not null default 0 check (confidence_score >= 0 and confidence_score <= 1),
  urgency_level text not null default 'low' check (urgency_level in ('low', 'medium', 'high', 'critical')),
  analysis_state text not null default 'pending' check (analysis_state in ('pending', 'analyzing', 'validated', 'needs_review', 'report_ready')),
  threat_state text not null default 'discovered' check (threat_state in ('discovered', 'captured', 'analyzing', 'validated', 'needs_review', 'report_ready', 'closed')),
  legal_recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, brand_id) references public.brands (tenant_id, id) on delete cascade
);

create index if not exists idx_threats_tenant_id on public.threats (tenant_id);
create index if not exists idx_threats_brand_id on public.threats (brand_id);
create index if not exists idx_threats_threat_state on public.threats (threat_state);
create index if not exists idx_threats_created_at on public.threats (created_at desc);

alter table public.tenants enable row level security;
alter table public.brands enable row level security;
alter table public.threats enable row level security;

create policy "tenants_select_own_tenant"
  on public.tenants
  for select
  using (id::text = auth.jwt() ->> 'tenant_id');

create policy "brands_select_own_tenant"
  on public.brands
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenant_id');

create policy "threats_select_own_tenant"
  on public.threats
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenant_id');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.touch_updated_at();

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.touch_updated_at();

drop trigger if exists set_threats_updated_at on public.threats;
create trigger set_threats_updated_at
before update on public.threats
for each row execute function public.touch_updated_at();

create or replace function public.seed_sample_brand_and_threat(
  p_tenant_id uuid,
  p_owner_user_id uuid,
  p_brand_name text,
  p_official_domain text,
  p_target_url text,
  p_observed_domain text,
  p_threat_type text,
  p_html_snapshot_path text,
  p_screenshot_path text
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_brand_id uuid;
begin
  insert into public.tenants (id, name, owner_user_id)
  values (p_tenant_id, p_brand_name || ' tenant', p_owner_user_id)
  on conflict (id) do update
    set name = excluded.name,
        owner_user_id = excluded.owner_user_id;

  insert into public.brands (tenant_id, brand_name, official_domain)
  values (p_tenant_id, p_brand_name, p_official_domain)
  on conflict (tenant_id, brand_name) do update
    set official_domain = excluded.official_domain
  returning id into v_brand_id;

  insert into public.threats (
    tenant_id,
    brand_id,
    threat_type,
    target_url,
    observed_domain,
    raw_title,
    html_snapshot_path,
    screenshot_path,
    threat_score,
    confidence_score,
    urgency_level,
    analysis_state,
    threat_state,
    legal_recommendation
  )
  values (
    p_tenant_id,
    v_brand_id,
    p_threat_type,
    p_target_url,
    p_observed_domain,
    p_brand_name || ' impersonation',
    p_html_snapshot_path,
    p_screenshot_path,
    90,
    0.95,
    'high',
    'validated',
    'report_ready',
    'Review takedown options and preserve evidence.'
  );
end;
$$;

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;