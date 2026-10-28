-- TeleKamera core schema: roles, releases, admin security, audit log

create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- One-time administrator bootstrap marker. Server-only: no anon/authenticated grants.
create table public.bootstrap_state (
  id boolean primary key default true check (id),
  completed_at timestamptz,
  admin_user_id uuid
);

-- Forced password change flag; only the service role may update it.
create table public.admin_security (
  user_id uuid primary key,
  must_change_password boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'windows')),
  version text not null,
  build_number text,
  channel text not null default 'stable' check (channel in ('stable', 'beta', 'pre_release')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  release_notes text not null default '',
  released_at timestamptz,
  min_os_version text,
  storage_key text not null,
  original_filename text not null,
  file_size bigint,
  sha256 text,
  content_type text,
  replaced_from uuid references public.releases(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index releases_public_listing on public.releases (platform, channel, status, released_at desc nulls last, created_at desc);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger releases_set_updated_at
before update on public.releases
for each row execute function public.set_updated_at();

-- Grants (Data API needs explicit grants on public schema)
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select on public.admin_security to authenticated;
grant all on public.admin_security to service_role;
grant all on public.bootstrap_state to service_role;
grant select on public.releases to anon;
grant select, insert, update, delete on public.releases to authenticated;
grant all on public.releases to service_role;
grant select, insert on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;

-- RLS
alter table public.user_roles enable row level security;
alter table public.bootstrap_state enable row level security;
alter table public.admin_security enable row level security;
alter table public.releases enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "Users can read own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "Admin can read own security state"
on public.admin_security for select
to authenticated
using (auth.uid() = user_id);

create policy "Public can view published releases"
on public.releases for select
to anon, authenticated
using (status = 'published');

create policy "Admins manage releases"
on public.releases for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read audit log"
on public.admin_audit_log for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can write audit log"
on public.admin_audit_log for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- Private storage bucket 'releases': only admins may upload, read or delete
create policy "Admins can upload release files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'releases' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can read release files"
on storage.objects for select
to authenticated
using (bucket_id = 'releases' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete release files"
on storage.objects for delete
to authenticated
using (bucket_id = 'releases' and public.has_role(auth.uid(), 'admin'));