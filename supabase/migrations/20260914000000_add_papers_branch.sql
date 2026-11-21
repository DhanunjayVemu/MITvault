-- Upgrade older PYQvault projects that were created before semester branches
-- were stored on paper metadata. Safe to run more than once.
alter table public.papers add column if not exists branch text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'papers_branch_check'
  ) then
    alter table public.papers add constraint papers_branch_check
      check (
        branch in (
          'cs', 'mnc', 'fintech', 'ece', 'eee', 'mech',
          'mechatronics', 'aero', 'civil', 'biotech', 'chemical'
        )
      );
  end if;
end $$;

create index if not exists papers_lookup_idx
  on public.papers (semester, stream, cycle, branch, subject_code);

-- Refresh PostgREST's schema cache so inserts can use `branch` immediately.
notify pgrst, 'reload schema';
