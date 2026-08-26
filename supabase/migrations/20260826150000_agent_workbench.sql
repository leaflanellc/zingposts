create table if not exists public.collaboration_sessions (
  id text primary key,
  user_id text not null,
  agent_id text,
  agent_name text not null,
  objective text not null,
  status text not null,
  summary text not null,
  context_json text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.collaboration_items (
  id text primary key,
  session_id text not null,
  user_id text not null,
  created_by_type text not null,
  created_by_name text not null,
  kind text not null,
  title text not null,
  body text not null,
  listing_ids_json text not null,
  options_json text not null,
  status text not null,
  response_json text,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.action_requests (
  user_id text not null,
  action text not null,
  idempotency_key text not null,
  result_json text not null,
  created_at text not null,
  primary key (user_id, action, idempotency_key)
);

create index if not exists idx_collaboration_sessions_user_updated
  on public.collaboration_sessions(user_id, updated_at);
create index if not exists idx_collaboration_items_session_created
  on public.collaboration_items(session_id, created_at);
create index if not exists idx_collaboration_items_user_status
  on public.collaboration_items(user_id, status);

alter table public.collaboration_sessions enable row level security;
alter table public.collaboration_items enable row level security;
alter table public.action_requests enable row level security;
