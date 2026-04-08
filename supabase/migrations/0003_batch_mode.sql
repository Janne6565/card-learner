-- Batch mode support for study sessions.
-- batch_size: how many cards per batch (null = unlimited, existing behaviour)
-- batch_card_ids: card IDs in the current active batch
-- graduated_card_ids: card IDs rated Easy at least once in this session

alter table public.study_sessions
  add column if not exists batch_size int default null,
  add column if not exists batch_card_ids text[] default null,
  add column if not exists graduated_card_ids text[] default '{}';
