import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const base=process.env.ZINGPOSTS_URL??'http://localhost:3000'; const supabaseUrl=process.env.SUPABASE_URL; const anonKey=process.env.SUPABASE_ANON_KEY; const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl&&anonKey&&serviceKey,'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.');
const database=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}); const runId=randomUUID().replaceAll('-','').slice(0,16); const email=`human-auth-${runId}@example.test`; const password=randomBytes(24).toString('base64url');
let userId=''; let authUserId='';

async function cleanup(){
  if(userId){await database.from('account_identities').delete().eq('workspace_user_id',userId);await database.from('activity_events').delete().eq('user_id',userId);await database.from('alerts').delete().eq('user_id',userId);await database.from('saved_items').delete().eq('user_id',userId);const {data:boards}=await database.from('boards').select('id').eq('user_id',userId);if(boards?.length)await database.from('board_items').delete().in('board_id',boards.map(board=>board.id));await database.from('boards').delete().eq('user_id',userId);await database.from('user_preferences').delete().eq('user_id',userId);await database.from('users').delete().eq('id',userId)}
  if(authUserId)await database.auth.admin.deleteUser(authUserId);
}

try{
  const prototype=await fetch(`${base}/api/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'sign-in',name:'Human auth integration',email})}); assert.equal(prototype.ok,true); const prototypeCookie=prototype.headers.getSetCookie?.()[0]?.split(';')[0]??prototype.headers.get('set-cookie')?.split(';')[0];
  const initialResponse=await fetch(`${base}/api/state`,{headers:{cookie:prototypeCookie}}); const initial=await initialResponse.json(); userId=initial.user.userId; assert.equal(initial.verification.status,'unverified');
  const created=await database.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Human auth integration'}}); assert.equal(created.error,null,created.error?.message); authUserId=created.data.user.id; const timestamp=new Date().toISOString(); const linked=await database.from('account_identities').insert({workspace_user_id:userId,auth_user_id:authUserId,verified_email:email,verified_at:timestamp,created_at:timestamp,updated_at:timestamp}); assert.equal(linked.error,null,linked.error?.message);
  const blockedLegacy=await fetch(`${base}/api/state`,{headers:{cookie:prototypeCookie}}); const blockedState=await blockedLegacy.json(); assert.equal(blockedState.authenticated,false,'a verified workspace must reject the old deterministic-email cookie');
  const jar=new Map(); const auth=createServerClient(supabaseUrl,anonKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(item=>jar.set(item.name,item.value))},auth:{flowType:'pkce'}}); const signedIn=await auth.auth.signInWithPassword({email,password}); assert.equal(signedIn.error,null,signedIn.error?.message);
  const supabaseCookies=[...jar].map(([name,value])=>`${name}=${value}`).join('; '); const authenticated=await fetch(`${base}/api/state`,{headers:{cookie:`${prototypeCookie}; ${supabaseCookies}`}}); assert.equal(authenticated.ok,true); const state=await authenticated.json(); assert.equal(state.authenticated,true); assert.equal(state.authMode,'supabase-email-otp'); assert.equal(state.verification.status,'verified'); assert.equal(state.user.email,email);
  const authStatusResponse=await fetch(`${base}/api/state`,{method:'POST',headers:{'content-type':'application/json',cookie:`${prototypeCookie}; ${supabaseCookies}`},body:JSON.stringify({action:'get_auth_status',input:{},actor:{type:'human',name:'Spoofed client name'}})}); const authStatus=await authStatusResponse.json(); assert.equal(authStatus.result.authLevel,'verified-human'); assert.equal(authStatus.result.supabaseAuthenticated,true); assert.equal(authStatus.result.user.displayName,'Human auth integration');
  console.log(JSON.stringify({ok:true,legacyPrototypeAccessDisabled:true,supabaseSessionRequired:true,verifiedHumanIdentityServerDerived:true},null,2));
} finally {
  await cleanup();
}
