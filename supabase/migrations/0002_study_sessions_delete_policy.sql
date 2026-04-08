-- Allow owners to delete their own study sessions.
-- The initial migration intentionally omitted this policy, which meant the
-- delete-session server action silently matched zero rows under RLS.

create policy "study_sessions: owner delete"
  on public.study_sessions
  for delete
  using (auth.uid() = user_id);
