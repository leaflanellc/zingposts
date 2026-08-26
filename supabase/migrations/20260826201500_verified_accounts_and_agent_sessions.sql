create table if not exists public.account_identities (
  workspace_user_id text primary key references public.users(id) on delete cascade,
  auth_user_id uuid not null unique,
  verified_email text not null unique,
  verified_at text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.agent_auth_codes (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  agent_id text not null references public.agent_connections(id) on delete cascade,
  code_hash text not null unique,
  created_by_auth_user_id uuid not null,
  created_at text not null,
  expires_at text not null,
  used_at text
);

create table if not exists public.agent_sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  agent_id text not null references public.agent_connections(id) on delete cascade,
  token_hash text not null unique,
  created_at text not null,
  expires_at text not null,
  last_seen_at text not null,
  revoked_at text
);

create index if not exists idx_account_identities_email on public.account_identities(verified_email);
create index if not exists idx_agent_auth_codes_user_expiry on public.agent_auth_codes(user_id, expires_at);
create index if not exists idx_agent_sessions_user_expiry on public.agent_sessions(user_id, expires_at);

alter table public.account_identities enable row level security;
alter table public.agent_auth_codes enable row level security;
alter table public.agent_sessions enable row level security;
