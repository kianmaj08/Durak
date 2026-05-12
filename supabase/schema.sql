-- Durak Schema (run once in Supabase SQL editor)
-- Casual friends-only game — no auth, but anyone with a lobby code can read/write.
-- The 5-digit code gives reasonable obscurity for a closed-friends use case.

create table if not exists lobbies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id text not null,
  phase text not null default 'lobby',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lobby_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  player_id text not null,
  nickname text not null,
  seat int not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (lobby_id, player_id)
);

create table if not exists game_states (
  lobby_id uuid primary key references lobbies(id) on delete cascade,
  state jsonb not null,
  turn_counter int not null default 0,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_lobbies_code on lobbies(code);
create index if not exists idx_lobby_players_lobby on lobby_players(lobby_id);

-- Realtime: enable publication for these tables
alter publication supabase_realtime add table lobbies;
alter publication supabase_realtime add table lobby_players;
alter publication supabase_realtime add table game_states;

-- RLS: enable, then open policies (casual game, no auth)
alter table lobbies enable row level security;
alter table lobby_players enable row level security;
alter table game_states enable row level security;

drop policy if exists "open_all" on lobbies;
create policy "open_all" on lobbies for all using (true) with check (true);

drop policy if exists "open_all" on lobby_players;
create policy "open_all" on lobby_players for all using (true) with check (true);

drop policy if exists "open_all" on game_states;
create policy "open_all" on game_states for all using (true) with check (true);
