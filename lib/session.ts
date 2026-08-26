import { cookies } from 'next/headers';
import type { AppUser } from '@/lib/scoutboard-store';

export const SESSION_COOKIE='zingposts-session';
const encoder=new TextEncoder();

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
  return {userId:`usr_${base64url(digest).slice(0,20)}`,email:normalized,displayName:name.trim()};
}

export async function encodeSession(user:AppUser){
  const payload=base64url(JSON.stringify(user));
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

async function decodeSession(value:string):Promise<AppUser|null>{
  const [payload,signature]=value.split('.'); if(!payload||!signature)return null;
  const valid=await crypto.subtle.verify('HMAC',await signingKey(),Buffer.from(signature,'base64url'),encoder.encode(payload)); if(!valid)return null;
  try{const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as AppUser;return parsed.userId&&parsed.email&&parsed.displayName?parsed:null}catch{return null}
}

export async function currentUser():Promise<AppUser|null>{
  const value=(await cookies()).get(SESSION_COOKIE)?.value;
  if(value==='anonymous')return null;
  if(value){const user=await decodeSession(value);if(user)return user;}
  if(process.env.NODE_ENV==='development')return {userId:'user_demo',email:'demo@zingposts.com',displayName:'Jonathan Ferrell'};
  return null;
}

export const sessionCookieOptions={httpOnly:true,sameSite:'lax' as const,path:'/',maxAge:60*60*24*30,secure:process.env.NODE_ENV==='production'};
