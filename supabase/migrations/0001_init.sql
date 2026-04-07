-- Card-Learner: initial schema
-- Run against your Supabase project via the SQL editor or supabase db push

-- ============================================================
-- TABLES
-- ============================================================

-- Decks
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Cards (one row per Anki note front/back)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null,                   -- denormalized for RLS speed
  guid text,                               -- anki guid (nullable)
  notetype text,
  front text not null,
  back text not null,
  tags text[] not null default '{}',
  is_html boolean not null default true,
  -- SM-2 state
  ease_factor real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  lapses int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cards_deck_id on public.cards (deck_id);
create index if not exists idx_cards_user_due on public.cards (user_id, due_at);

-- Review log (for stats / undo)
create table if not exists public.reviews (
  id bigserial primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null,
  rating smallint not null,                -- 1=Again 2=Hard 3=Good 4=Easy
  prev_interval int,
  new_interval int,
  reviewed_at timestamptz not null default now()
);

-- Study sessions (ephemeral, QR-linked)
create table if not exists public.study_sessions (
  token text primary key,                  -- short random url-safe id
  user_id uuid not null,
  deck_id uuid not null references public.decks(id) on delete cascade,
  status text not null default 'pending',  -- pending | active | done | expired
  total int not null default 0,
  completed int not null default 0,
  again_count int not null default 0,
  hard_count int not null default 0,
  good_count int not null default 0,
  easy_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.reviews enable row level security;
alter table public.study_sessions enable row level security;

-- Decks: full CRUD for owner
create policy "decks: owner select"   on public.decks for select using (auth.uid() = user_id);
create policy "decks: owner insert"   on public.decks for insert with check (auth.uid() = user_id);
create policy "decks: owner update"   on public.decks for update using (auth.uid() = user_id);
create policy "decks: owner delete"   on public.decks for delete using (auth.uid() = user_id);

-- Cards: full CRUD for owner
create policy "cards: owner select"   on public.cards for select using (auth.uid() = user_id);
create policy "cards: owner insert"   on public.cards for insert with check (auth.uid() = user_id);
create policy "cards: owner update"   on public.cards for update using (auth.uid() = user_id);
create policy "cards: owner delete"   on public.cards for delete using (auth.uid() = user_id);

-- Reviews: full CRUD for owner
create policy "reviews: owner select" on public.reviews for select using (auth.uid() = user_id);
create policy "reviews: owner insert" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews: owner update" on public.reviews for update using (auth.uid() = user_id);
create policy "reviews: owner delete" on public.reviews for delete using (auth.uid() = user_id);

-- Study sessions: owner can SELECT / INSERT / UPDATE
-- Phone access goes through service-role API routes, not direct RLS
create policy "study_sessions: owner select" on public.study_sessions for select using (auth.uid() = user_id);
create policy "study_sessions: owner insert" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "study_sessions: owner update" on public.study_sessions for update using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for study_sessions so desktop can subscribe to changes
alter publication supabase_realtime add table public.study_sessions;
