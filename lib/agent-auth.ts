import 'server-only';

import { cookies } from 'next/headers';
import { supabaseDatabase, supabaseRequest } from '@/lib/supabase-server';
import type { AppUser } from '@/lib/scoutboard-store';

export const AGENT_SESSION_COOKIE='zingposts-agent-session';
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const encoder=new TextEncoder();

function now(){return new Date().toISOString()}
function identifier(prefix:string){return `${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,16)}`}
function normalizeCode(value:string){return value.toUpperCase().replace(/[^A-Z2-9]/g,'')}
async function hash(value:string){const digest=await crypto.subtle.digest('SHA-256',encoder.encode(value));return Buffer.from(digest).toString('base64url')}
function randomCode(){const bytes=crypto.getRandomValues(new Uint8Array(10));const value=[...bytes].map(byte=>CODE_ALPHABET[byte%CODE_ALPHABET.length]).join('');return `${value.slice(0,5)}-${value.slice(5)}`}
function randomToken(){return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')}

export const agentSessionCookieOptions={httpOnly:true,sameSite:'lax' as const,path:'/',maxAge:60*60*12,secure:process.env.NODE_ENV==='production'};

export async function issueAgentAuthCode(user:AppUser,name:string,requestedScopes?:string[]){
  if(user.authLevel!=='verified-human'||!user.supabaseUserId)throw new Error('Verify and sign in to the human account before issuing an agent code.');
  const database=supabaseDatabase(); const timestamp=now(); const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
  const agentId=identifier('agt'); const code=randomCode(); const codeHash=await hash(normalizeCode(code));
  const safeScopes=['marketplace:read','workspace:write','research:write','alerts:draft','listing:draft','communication:draft'];
  const scopes=(requestedScopes?.length?requestedScopes:safeScopes).filter(scope=>safeScopes.includes(scope));
  await database.prepare(`INSERT INTO agent_connections (id,user_id,name,status,scopes_json,pairing_code,setup_json,created_at,last_seen_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(agentId,user.userId,name.trim()||'Outside agent','awaiting_auth',JSON.stringify(scopes),null,null,timestamp,null).run();
  await database.prepare(`INSERT INTO agent_auth_codes (id,user_id,agent_id,code_hash,created_by_auth_user_id,created_at,expires_at,used_at) VALUES (?,?,?,?,?,?,?,?)`).bind(identifier('acode'),user.userId,agentId,codeHash,user.supabaseUserId,timestamp,expiresAt,null).run();
  return {agentId,code,expiresAt,expiresInSeconds:600,status:'awaiting_agent',scopes,oneTime:true};
}

export async function redeemAgentAuthCode(code:string){
  const normalized=normalizeCode(code); if(normalized.length!==10)throw new Error('Enter the 10-character agent connection code.');
  const codeHash=await hash(normalized); const timestamp=now();
  const token=randomToken(); const tokenHash=await hash(token); const sessionId=identifier('ases'); const expiresAt=new Date(Date.now()+12*60*60*1000).toISOString();
  const response=await supabaseRequest('/rest/v1/rpc/redeem_agent_auth_code',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p_code_hash:codeHash,p_session_id:sessionId,p_token_hash:tokenHash,p_now:timestamp,p_expires_at:expiresAt})});
  const records=await response.json().catch(()=>[]) as Array<Record<string,unknown>>|{message?:string};
  if(!response.ok)throw new Error(!Array.isArray(records)&&records.message?records.message:'Agent code redemption failed.');
  const record=Array.isArray(records)?records[0]:null;
  if(!record)throw new Error('This agent code is invalid, expired, already used, or revoked. Ask the user for a new code.');
  return {token,session:{sessionId,userId:String(record.workspace_user_id),agentId:String(record.connection_id),name:String(record.agent_name),scopes:JSON.parse(String(record.granted_scopes??'[]')),expiresAt,status:'active'}};
}

export async function setAgentSessionCookie(token:string){(await cookies()).set(AGENT_SESSION_COOKIE,token,agentSessionCookieOptions)}

export async function currentAgentSession(userId?:string){
  const token=(await cookies()).get(AGENT_SESSION_COOKIE)?.value; if(!token)return null;
  const database=supabaseDatabase(); const tokenHash=await hash(token);
  const session=await database.prepare(`SELECT s.*,a.name,a.scopes_json,a.status AS agent_status FROM agent_sessions s JOIN agent_connections a ON a.id=s.agent_id WHERE s.token_hash=?`).bind(tokenHash).first<Record<string,unknown>>();
  if(!session||session.revoked_at||session.agent_status!=='active'||Date.parse(String(session.expires_at))<=Date.now()||userId&&session.user_id!==userId)return null;
  const timestamp=now(); await database.prepare(`UPDATE agent_sessions SET last_seen_at=? WHERE id=?`).bind(timestamp,session.id).run();
  return {sessionId:String(session.id),userId:String(session.user_id),agentId:String(session.agent_id),name:String(session.name),scopes:JSON.parse(String(session.scopes_json??'[]')),expiresAt:String(session.expires_at),status:'active'};
}

export async function revokeAgentSessions(agentId:string,userId:string){await supabaseDatabase().prepare(`UPDATE agent_sessions SET revoked_at=? WHERE agent_id=? AND user_id=? AND revoked_at IS NULL`).bind(now(),agentId,userId).run()}
