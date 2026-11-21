-- Run this once in your Supabase project's SQL editor (Database → SQL Editor).
-- It creates the `papers` table that stores metadata for every uploaded PDF,
-- and the Row Level Security policies that let the site read papers
-- publicly while only your server-side admin routes (using the service role
-- key) can write.
--
-- You still need to create the storage bucket by hand first — see the
-- "Storage bucket" section below — because bucket creation isn't reliably
-- scriptable the same way across Supabase projects.

-- 1. Table -------------------------------------------------------------

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  semester smallint not null,
  stream text check (stream in ('cs', 'non-cs')),
  cycle text check (cycle in ('physics', 'chemistry')),
  -- Semester 3 forks by branch instead of stream/cycle.
  branch text,
  year text not null,
  exam text not null check (exam in ('End Sem', 'Mid Sem', 'Quiz')),
  file_name text,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

-- Safe migration for projects that created the table before file names were
-- recorded. Existing rows fall back to their storage filename in the UI.
alter table public.papers add column if not exists file_name text;

-- Safe migration for projects that created the table before the branch
-- dimension (semester 3) was introduced.
alter table public.papers add column if not exists branch text;

-- This must be created after the safe branch migration above: existing
-- installations can have the original table without `branch`.
create index if not exists papers_lookup_idx
  on public.papers (semester, stream, cycle, branch, subject_code);

-- Make the new column available to the PostgREST API immediately rather than
-- waiting for its automatic schema-cache refresh.
notify pgrst, 'reload schema';

-- 2. Row Level Security --------------------------------------------------

alter table public.papers enable row level security;

-- Anyone (the public anon key used by the site) can read paper metadata.
create policy "Public read access"
  on public.papers
  for select
  using (true);

-- Nobody using the anon/public key can insert, update, or delete — only the
-- service role key (used exclusively by app/api/admin/* route handlers on
-- the server) can, since the service role bypasses RLS entirely.

-- 3. Storage bucket -------------------------------------------------------
--
-- In the Supabase dashboard: Storage → New bucket
--   Name:   papers
--   Public: ON   (so getPublicUrl() works directly for viewing/downloading)
--
-- Then, still in Storage → papers → Policies, the default "public bucket"
-- setup already allows public SELECT (read) on objects. No INSERT/UPDATE/
-- DELETE policy is needed for the anon key, since all uploads/deletes go
-- through the admin API routes using the service role key, which bypasses
-- storage RLS the same way it does for the table above.

-- Editable course lists (admin → Courses). Safe to run more than once.
-- The site reads these publicly; only the admin API routes (service role) write.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  semester smallint not null check (semester between 1 and 8),
  stream text check (stream in ('cs', 'non-cs')),
  cycle text check (cycle in ('physics', 'chemistry')),
  branch text,
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
  coming_soon boolean not null default true,
  branches text[]
);

alter table public.semester_settings add column if not exists branches text[];

alter table public.courses enable row level security;
alter table public.semester_settings enable row level security;

drop policy if exists "Public read access" on public.courses;
create policy "Public read access" on public.courses for select using (true);

drop policy if exists "Public read access" on public.semester_settings;
create policy "Public read access" on public.semester_settings for select using (true);

notify pgrst, 'reload schema';
