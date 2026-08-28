create table if not exists public.workspace_checkpoints (
  user_id text not null references public.users(id) on delete cascade,
  actor_key text not null,
  actor_name text not null,
  checkpoint_at text not null,
  updated_at text not null,
  primary key (user_id, actor_key)
);

create table if not exists public.change_sets (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_by_type text not null,
  created_by_name text not null,
  title text not null,
  summary text not null,
  status text not null,
  changes_json text not null,
  sources_json text not null,
  created_at text not null,
  updated_at text not null,
  version integer not null default 1
);

create table if not exists public.listing_outcomes (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  outcome text not null,
  final_price numeric,
  reason text not null,
  notes text not null,
  created_by_type text not null,
  created_by_name text not null,
  occurred_at text not null,
  created_at text not null,
  updated_at text not null,
  version integer not null default 1
);

create index if not exists idx_workspace_checkpoints_user_updated on public.workspace_checkpoints(user_id,updated_at);
create index if not exists idx_change_sets_user_updated on public.change_sets(user_id,updated_at);
create index if not exists idx_listing_outcomes_user_occurred on public.listing_outcomes(user_id,occurred_at);
create index if not exists idx_listing_outcomes_listing on public.listing_outcomes(listing_id);

alter table public.workspace_checkpoints enable row level security;
alter table public.change_sets enable row level security;
alter table public.listing_outcomes enable row level security;
