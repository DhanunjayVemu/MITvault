-- Editable course lists (admin → Courses). Safe to run more than once.
-- The site reads these publicly; only the admin API routes (service role) write.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  semester smallint not null check (semester between 1 and 8),
  stream text check (stream in ('cs', 'non-cs')),
  cycle text check (cycle in ('physics', 'chemistry')),
  branch text check (
    branch in (
      'cs', 'mnc', 'fintech', 'ece', 'eee', 'mech',
      'mechatronics', 'aero', 'civil', 'biotech', 'chemical'
    )
  ),
  code text not null,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists courses_group_code_idx
  on public.courses (semester, coalesce(stream, ''), coalesce(cycle, ''), coalesce(branch, ''), code);

-- Per-semester "Coming soon" override (falls back to the built-in default
-- when a semester has no row here).
create table if not exists public.semester_settings (
  semester smallint primary key check (semester between 1 and 8),
  coming_soon boolean not null default true
);

alter table public.courses enable row level security;
alter table public.semester_settings enable row level security;

drop policy if exists "Public read access" on public.courses;
create policy "Public read access" on public.courses for select using (true);

drop policy if exists "Public read access" on public.semester_settings;
create policy "Public read access" on public.semester_settings for select using (true);

notify pgrst, 'reload schema';
