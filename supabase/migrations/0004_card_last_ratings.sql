-- Track each card's most recent rating in the session.
-- This lets the UI show "cards by latest rating" instead of cumulative button-press counters.
alter table public.study_sessions
  add column if not exists card_last_ratings jsonb default '{}';
