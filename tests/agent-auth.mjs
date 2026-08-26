import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const base=process.env.ZINGPOSTS_URL??'http://localhost:3000';
const supabaseUrl=process.env.SUPABASE_URL; const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl&&serviceKey,'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the agent-auth integration test.');
const database=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const runId=randomUUID().replaceAll('-','').slice(0,16); const email=`agent-auth-${runId}@example.test`; const name='Agent auth integration';
let userId=''; const agentId=`agt_test_${runId}`; const authUserId=randomUUID();

async function api(action,input={},cookie='zingposts-session=anonymous'){
  const response=await fetch(`${base}/api/state`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({action,input,actor:{type:'agent',name:'Untrusted client label'}})});
  return {response,body:await response.json()};
}

async function cleanup(){
  if(!userId)return;
  await database.from('agent_connections').delete().eq('id',agentId);
  await database.from('account_identities').delete().eq('workspace_user_id',userId);
  await database.from('confirmation_requests').delete().eq('user_id',userId);
  await database.from('activity_events').delete().eq('user_id',userId);
  await database.from('alerts').delete().eq('user_id',userId);
  await database.from('saved_items').delete().eq('user_id',userId);
  const {data:boards}=await database.from('boards').select('id').eq('user_id',userId);
  if(boards?.length)await database.from('board_items').delete().in('board_id',boards.map(board=>board.id));
  await database.from('boards').delete().eq('user_id',userId);
  await database.from('user_preferences').delete().eq('user_id',userId);
  await database.from('users').delete().eq('id',userId);
}

try{
  const sessionResponse=await fetch(`${base}/api/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'sign-in',name,email})});
  assert.equal(sessionResponse.ok,true,'prototype workspace setup failed');
  const humanCookie=sessionResponse.headers.getSetCookie?.()[0]?.split(';')[0]??sessionResponse.headers.get('set-cookie')?.split(';')[0]; assert.ok(humanCookie);
  const stateResponse=await fetch(`${base}/api/state`,{headers:{cookie:humanCookie}}); const state=await stateResponse.json(); userId=state.user.userId;
  const timestamp=new Date().toISOString(); const expiresAt=new Date(Date.now()+10*60*1000).toISOString(); const safeRunId=runId.replace(/[01]/g,'A').toUpperCase(); const code=`ZP${safeRunId.slice(0,8)}`; const normalized=code.replace(/[^A-Z2-9]/g,''); const codeHash=createHash('sha256').update(normalized).digest('base64url'); assert.equal(normalized.length,10);
  let result=await database.from('account_identities').insert({workspace_user_id:userId,auth_user_id:authUserId,verified_email:email,verified_at:timestamp,created_at:timestamp,updated_at:timestamp}); assert.equal(result.error,null,result.error?.message);
  result=await database.from('agent_connections').insert({id:agentId,user_id:userId,name:'Integration agent',status:'awaiting_auth',scopes_json:JSON.stringify(['marketplace:read','workspace:write']),pairing_code:null,setup_json:null,created_at:timestamp,last_seen_at:null}); assert.equal(result.error,null,result.error?.message);
  result=await database.from('agent_auth_codes').insert({id:`acode_test_${runId}`,user_id:userId,agent_id:agentId,code_hash:codeHash,created_by_auth_user_id:authUserId,created_at:timestamp,expires_at:expiresAt,used_at:null}); assert.equal(result.error,null,result.error?.message);

  const redeemed=await api('authenticate_agent',{code}); assert.equal(redeemed.response.ok,true,redeemed.body.error?.message); assert.equal(redeemed.body.result.name,'Integration agent');
  const agentCookie=redeemed.response.headers.getSetCookie?.()[0]?.split(';')[0]??redeemed.response.headers.get('set-cookie')?.split(';')[0]; assert.match(agentCookie,/^zingposts-agent-session=/);
  const replay=await api('authenticate_agent',{code}); assert.equal(replay.response.status,401,'one-time code replay should be rejected');
  const concurrentCode=`ZQ${safeRunId.slice(0,8)}`; const concurrentHash=createHash('sha256').update(concurrentCode.replace(/[^A-Z2-9]/g,'')).digest('base64url');
  result=await database.from('agent_auth_codes').insert({id:`acode_race_${runId}`,user_id:userId,agent_id:agentId,code_hash:concurrentHash,created_by_auth_user_id:authUserId,created_at:timestamp,expires_at:expiresAt,used_at:null}); assert.equal(result.error,null,result.error?.message);
  const concurrent=await Promise.all([api('authenticate_agent',{code:concurrentCode}),api('authenticate_agent',{code:concurrentCode})]);
  assert.equal(concurrent.filter(attempt=>attempt.response.ok).length,1,'exactly one simultaneous redemption should succeed');
  assert.equal(concurrent.filter(attempt=>attempt.response.status===401).length,1,'the competing redemption should be rejected');
  const cookie=`zingposts-session=anonymous; ${agentCookie}`;
  const auth=await api('get_auth_status',{},cookie); assert.equal(auth.response.ok,true); assert.equal(auth.body.result.authLevel,'verified-agent'); assert.equal(auth.body.result.supabaseAuthenticated,false);
  const boards=await api('list_boards',{},cookie); assert.equal(boards.response.ok,true); assert.ok(boards.body.result.boards.length>=3);
  const consequential=await api('request_listing_publish',{listingId:'lst_nonexistent',confirmed:true},cookie); assert.equal(consequential.response.ok,true); assert.equal(consequential.body.result.confirmationRequired,true); assert.equal(consequential.body.result.humanRequired,true);
  await database.from('agent_connections').update({status:'revoked'}).eq('id',agentId); await database.from('agent_sessions').update({revoked_at:new Date().toISOString()}).eq('agent_id',agentId);
  const revoked=await api('list_boards',{},cookie); assert.equal(revoked.response.status,401,'revoked agent session should lose private access');
  console.log(JSON.stringify({ok:true,codeSingleUse:true,concurrentRedemptionSafe:true,agentIdentityServerDerived:true,privateWorkspaceAccess:true,humanConfirmationStillRequired:true,revocationImmediate:true},null,2));
} finally {
  await cleanup();
}
