-- Allow admin-defined branch names.
alter table public.papers
  drop constraint if exists papers_branch_check;

alter table public.courses
  drop constraint if exists courses_branch_check;

notify pgrst, 'reload schema';
