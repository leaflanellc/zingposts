alter table public.boards add column if not exists version integer not null default 1;
alter table public.boards add column if not exists updated_at text;
update public.boards set updated_at=coalesce(updated_at,created_at);

alter table public.listings add column if not exists version integer not null default 1;
alter table public.alerts add column if not exists version integer not null default 1;
alter table public.alerts add column if not exists updated_at text;
update public.alerts set updated_at=coalesce(updated_at,created_at);

alter table public.conversations add column if not exists version integer not null default 1;
alter table public.trade_rooms add column if not exists version integer not null default 1;
alter table public.trade_rooms add column if not exists updated_at text;
update public.trade_rooms set updated_at=coalesce(updated_at,created_at);

alter table public.collaboration_sessions add column if not exists version integer not null default 1;

create table if not exists public.qa_runs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  label text not null,
  status text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.qa_artifacts (
  qa_run_id text not null references public.qa_runs(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  created_at text not null,
  primary key (qa_run_id, entity_type, entity_id)
);

create index if not exists idx_qa_runs_user_created on public.qa_runs(user_id,created_at);
create index if not exists idx_qa_artifacts_user_run on public.qa_artifacts(user_id,qa_run_id);

alter table public.qa_runs enable row level security;
alter table public.qa_artifacts enable row level security;
