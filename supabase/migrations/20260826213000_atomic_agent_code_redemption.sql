create or replace function public.redeem_agent_auth_code(
  p_code_hash text,
  p_session_id text,
  p_token_hash text,
  p_now text,
  p_expires_at text
)
returns table (
  code_id text,
  workspace_user_id text,
  connection_id text,
  agent_name text,
  granted_scopes text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_code_id text;
  claimed_user_id text;
  claimed_agent_id text;
begin
  update public.agent_auth_codes as code
  set used_at = p_now
  from public.agent_connections as connection
  where code.code_hash = p_code_hash
    and code.used_at is null
    and code.expires_at > p_now
    and connection.id = code.agent_id
    and connection.user_id = code.user_id
    and connection.status <> 'revoked'
  returning code.id, code.user_id, code.agent_id
  into claimed_code_id, claimed_user_id, claimed_agent_id;

  if not found then
    return;
  end if;

  insert into public.agent_sessions (
    id, user_id, agent_id, token_hash, created_at, expires_at, last_seen_at, revoked_at
  ) values (
    p_session_id, claimed_user_id, claimed_agent_id, p_token_hash, p_now, p_expires_at, p_now, null
  );

  update public.agent_connections
  set status = 'active', last_seen_at = p_now
  where id = claimed_agent_id and user_id = claimed_user_id;

  return query
  select claimed_code_id, claimed_user_id, claimed_agent_id, connection.name, connection.scopes_json
  from public.agent_connections as connection
  where connection.id = claimed_agent_id and connection.user_id = claimed_user_id;
end;
$$;

revoke all on function public.redeem_agent_auth_code(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_agent_auth_code(text, text, text, text, text) to service_role;
