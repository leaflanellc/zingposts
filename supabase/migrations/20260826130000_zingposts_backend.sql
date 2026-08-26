create table if not exists public.users (id text primary key, email text not null unique, name text not null, avatar text, created_at text not null);
create table if not exists public.user_preferences (user_id text primary key, preferences_json text not null, updated_at text not null);
create table if not exists public.agent_connections (id text primary key, user_id text not null, name text not null, status text not null, scopes_json text not null, pairing_code text, setup_json text, created_at text not null, last_seen_at text);
create table if not exists public.onboarding_sessions (id text primary key, initiated_by text not null, agent_name text not null, status text not null, pairing_code text not null, scopes_json text not null, preferences_json text not null, claimed_by_user_id text, created_at text not null, expires_at text not null, approved_at text);
create table if not exists public.listings (id text primary key, owner_id text not null, origin_type text not null, status text not null, title text not null, year integer, make text, model text, category text not null, price real not null, location text not null, description text not null, image text, source_url text, condition text not null, attributes_json text not null, completeness integer not null, watchers integer not null, created_at text not null, updated_at text not null);
create table if not exists public.boards (id text primary key, user_id text not null, name text not null, color text not null, description text not null, created_at text not null);
create table if not exists public.board_items (board_id text not null, listing_id text not null, rank integer not null, notes text, added_at text not null, primary key(board_id, listing_id));
create table if not exists public.saved_items (user_id text not null, listing_id text not null, status text not null, created_at text not null, primary key(user_id, listing_id));
create table if not exists public.alerts (id text primary key, user_id text not null, name text not null, query text not null, criteria_json text not null, status text not null, match_count integer not null, created_at text not null);
create table if not exists public.research_notes (id text primary key, user_id text not null, listing_id text not null, title text not null, body text not null, sources_json text not null, confidence text not null, created_at text not null);
create table if not exists public.conversations (id text primary key, listing_id text not null, buyer_id text not null, seller_id text not null, status text not null, created_at text not null, updated_at text not null);
create table if not exists public.messages (id text primary key, conversation_id text not null, sender_id text not null, sender_type text not null, body text not null, status text not null, created_at text not null);
create table if not exists public.offers (id text primary key, conversation_id text not null, listing_id text not null, buyer_id text not null, amount real not null, terms text not null, status text not null, created_at text not null, updated_at text not null);
create table if not exists public.trade_rooms (id text primary key, creator_id text not null, title text not null, status text not null, summary text not null, created_at text not null);
create table if not exists public.trade_participants (id text primary key, trade_id text not null, name text not null, email text, role text not null);
create table if not exists public.trade_assets (id text primary key, trade_id text not null, listing_id text, owner_name text not null, label text not null, value real not null, cash_adjustment real not null, conditions_json text not null);
create table if not exists public.activity_events (id text primary key, user_id text not null, actor_type text not null, actor_name text not null, action text not null, entity_type text not null, entity_id text, summary text not null, reversible integer not null, undo_json text, created_at text not null);
create table if not exists public.confirmation_requests (id text primary key, user_id text not null, action text not null, payload_json text not null, status text not null, created_at text not null);

create index if not exists idx_listings_status_category on public.listings(status, category);
create index if not exists idx_listings_owner on public.listings(owner_id);
create index if not exists idx_activity_user_created on public.activity_events(user_id, created_at);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_onboarding_status_expires on public.onboarding_sessions(status, expires_at);

create or replace function public.scoutboard_sql(statement text, parameters jsonb default '[]'::jsonb, query_mode text default 'query')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rendered text := statement;
  parameter jsonb;
  replacement text;
  marker text;
  parameter_index integer := 0;
  result jsonb;
begin
  for parameter in select value from jsonb_array_elements(coalesce(parameters, '[]'::jsonb)) loop
    marker := '__ZINGPOSTS_PARAM_' || parameter_index || '__';
    if strpos(rendered, marker) = 0 then raise exception 'Too many SQL parameters'; end if;
    replacement := case jsonb_typeof(parameter)
      when 'null' then 'NULL'
      when 'number' then parameter #>> '{}'
      when 'boolean' then parameter #>> '{}'
      else quote_literal(parameter #>> '{}')
    end;
    rendered := replace(rendered, marker, replacement);
    parameter_index := parameter_index + 1;
  end loop;
  if rendered ~ '__ZINGPOSTS_PARAM_[0-9]+__' then raise exception 'Missing SQL parameter'; end if;

  if query_mode = 'query' then
    execute 'select coalesce(jsonb_agg(to_jsonb(query_row)), ''[]''::jsonb) from (' || rendered || ') query_row' into result;
    return coalesce(result, '[]'::jsonb);
  end if;

  execute rendered;
  return '[]'::jsonb;
end;
$$;

revoke all on function public.scoutboard_sql(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.scoutboard_sql(text, jsonb, text) to service_role;

do $$
declare table_name text;
begin
  foreach table_name in array array['users','user_preferences','agent_connections','onboarding_sessions','listings','boards','board_items','saved_items','alerts','research_notes','conversations','messages','offers','trade_rooms','trade_participants','trade_assets','activity_events','confirmation_requests'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', false, 8000000, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
