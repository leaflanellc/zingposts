import { cookies } from 'next/headers';
import type { AppUser } from '@/lib/scoutboard-store';
import { supabaseDatabase } from '@/lib/supabase-server';
import { currentSupabaseUser } from '@/lib/supabase-auth';

export const SESSION_COOKIE='zingposts-session';
const encoder=new TextEncoder();
type AuthIntent={version:1;mode:'login'|'upgrade';workspaceUserId?:string;expiresAt:number};

function secret(){
  const configured=process.env.SESSION_SECRET?.trim();
  if(configured)return configured;
  if(process.env.NODE_ENV==='development')return 'local-zingposts-development-session';
  throw new Error('SESSION_SECRET is not configured.');
}

function base64url(value:Uint8Array|string){
  const bytes=typeof value==='string'?encoder.encode(value):value;
  return Buffer.from(bytes).toString('base64url');
}

async function signingKey(){return crypto.subtle.importKey('raw',encoder.encode(secret()),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}

export async function makeUser(name:string,email:string):Promise<AppUser>{
  const normalized=email.trim().toLowerCase();
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(normalized)));
  return {userId:`usr_${base64url(digest).slice(0,20)}`,email:normalized,displayName:name.trim(),authLevel:'prototype'};
}

export async function encodeSession(user:AppUser){
  const payload=base64url(JSON.stringify(user));
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

export async function encodeAuthIntent(mode:'login'|'upgrade',workspaceUserId?:string){
  const intent:AuthIntent={version:1,mode,workspaceUserId:mode==='upgrade'?workspaceUserId:undefined,expiresAt:Date.now()+15*60*1000};
  const payload=base64url(JSON.stringify(intent));
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

export async function decodeAuthIntent(value:string|undefined|null):Promise<AuthIntent|null>{
  if(!value)return null;
  const [payload,signature]=value.split('.'); if(!payload||!signature)return null;
  const valid=await crypto.subtle.verify('HMAC',await signingKey(),Buffer.from(signature,'base64url'),encoder.encode(payload)); if(!valid)return null;
  try{
    const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Partial<AuthIntent>;
    if(parsed.version!==1||!['login','upgrade'].includes(String(parsed.mode))||typeof parsed.expiresAt!=='number'||parsed.expiresAt<Date.now())return null;
    if(parsed.mode==='upgrade'&&(!parsed.workspaceUserId||!parsed.workspaceUserId.startsWith('usr_')))return null;
    return parsed as AuthIntent;
  }catch{return null}
}

async function decodeSession(value:string):Promise<AppUser|null>{
  const [payload,signature]=value.split('.'); if(!payload||!signature)return null;
  const valid=await crypto.subtle.verify('HMAC',await signingKey(),Buffer.from(signature,'base64url'),encoder.encode(payload)); if(!valid)return null;
  try{const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as AppUser;return parsed.userId&&parsed.email&&parsed.displayName?parsed:null}catch{return null}
}

type IdentityRow={workspace_user_id:string;auth_user_id:string;verified_email:string;verified_at:string};
type UserRow={id:string;email:string;name:string};

async function identityFor(column:'workspace_user_id'|'auth_user_id',value:string){
  return supabaseDatabase().prepare(`SELECT * FROM account_identities WHERE ${column}=?`).bind(value).first<IdentityRow>();
}

async function storedUser(userId:string){
  return supabaseDatabase().prepare(`SELECT id,email,name FROM users WHERE id=?`).bind(userId).first<UserRow>();
}

export async function prototypeUserForVerification(userId:string):Promise<AppUser|null>{
  if(await identityFor('workspace_user_id',userId))return null;
  const user=await storedUser(userId); if(!user)return null;
  return {userId:user.id,email:user.email,displayName:user.name,authLevel:'prototype'};
}

export async function verifiedUserForAuthUser(authUserId:string):Promise<AppUser|null>{
  const identity=await identityFor('auth_user_id',authUserId); if(!identity)return null;
  const user=await storedUser(identity.workspace_user_id); if(!user)return null;
  return {userId:user.id,email:user.email,displayName:user.name,authLevel:'verified-human',supabaseUserId:authUserId};
}

export async function workspaceUserForAgent(userId:string):Promise<AppUser|null>{
  const identity=await identityFor('workspace_user_id',userId); if(!identity)return null;
  const user=await storedUser(userId); if(!user)return null;
  return {userId:user.id,email:user.email,displayName:user.name,authLevel:'verified-agent',supabaseUserId:identity.auth_user_id};
}

export async function verifiedIdentityForWorkspace(userId:string){return identityFor('workspace_user_id',userId)}

export async function linkVerifiedIdentity(workspaceUser:AppUser,authUserId:string,verifiedEmail:string){
  const normalized=verifiedEmail.trim().toLowerCase(); const timestamp=new Date().toISOString(); const database=supabaseDatabase();
  const existingAuth=await identityFor('auth_user_id',authUserId);
  if(existingAuth){
    const existingUser=await storedUser(existingAuth.workspace_user_id);
    if(!existingUser)throw new Error('The verified workspace could not be loaded.');
    return {user:{userId:existingUser.id,email:existingUser.email,displayName:existingUser.name,authLevel:'verified-human' as const,supabaseUserId:authUserId},existing:true};
  }
  const existingWorkspace=await identityFor('workspace_user_id',workspaceUser.userId);
  if(existingWorkspace&&existingWorkspace.auth_user_id!==authUserId)throw new Error('This workspace is already connected to another verified account.');
  await database.prepare(`WITH updated AS (UPDATE users SET email=?,name=? WHERE id=? RETURNING id) INSERT INTO account_identities (workspace_user_id,auth_user_id,verified_email,verified_at,created_at,updated_at) SELECT id,?,?,?,?,? FROM updated ON CONFLICT (workspace_user_id) DO UPDATE SET auth_user_id=EXCLUDED.auth_user_id,verified_email=EXCLUDED.verified_email,verified_at=EXCLUDED.verified_at,updated_at=EXCLUDED.updated_at`).bind(normalized,workspaceUser.displayName,workspaceUser.userId,authUserId,normalized,timestamp,timestamp,timestamp).run();
  return {user:{...workspaceUser,email:normalized,authLevel:'verified-human' as const,supabaseUserId:authUserId},existing:false};
}

export async function currentUser():Promise<AppUser|null>{
  const store=await cookies(); const value=store.get(SESSION_COOKIE)?.value;
  const prototype=value&&value!=='anonymous'?await decodeSession(value):null;
  const authUser=await currentSupabaseUser().catch(()=>null);
  if(authUser){
    const verified=await verifiedUserForAuthUser(authUser.id);
    if(verified){
      store.set(SESSION_COOKIE,await encodeSession(verified),sessionCookieOptions);
      return verified;
    }
  }
  if(value==='anonymous')return null;
  if(prototype){
    if(await identityFor('workspace_user_id',prototype.userId))return null;
    return {...prototype,authLevel:'prototype'};
  }
  if(process.env.NODE_ENV==='development')return {userId:'user_demo',email:'demo@zingposts.com',displayName:'Jonathan Ferrell',authLevel:'prototype'};
  return null;
}

export const sessionCookieOptions={httpOnly:true,sameSite:'lax' as const,path:'/',maxAge:60*60*24*30,secure:process.env.NODE_ENV==='production'};
