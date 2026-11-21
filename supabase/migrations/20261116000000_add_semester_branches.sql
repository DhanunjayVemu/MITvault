-- Enable admins to make a non-stream semester branch-based and select the
-- branches that students can see. NULL retains that semester's built-in
-- structure; a non-empty array overrides it.
alter table public.semester_settings
  add column if not exists branches text[];

notify pgrst, 'reload schema';
