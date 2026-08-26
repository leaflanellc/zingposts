import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, makeUser, SESSION_COOKIE, sessionCookieOptions, verifiedIdentityForWorkspace } from '@/lib/session';
import { supabaseAuthClient } from '@/lib/supabase-auth';

export async function POST(request:Request){
  const body=await request.json() as {mode?:string;name?:string;email?:string};
  const store=await cookies();
  if(body.mode==='logout'){
    await (await supabaseAuthClient()).auth.signOut().catch(()=>null);
    store.set(SESSION_COOKIE,'anonymous',sessionCookieOptions);
    store.set('zingposts-agent-session','',{...sessionCookieOptions,maxAge:0});
    return NextResponse.json({ok:true,authenticated:false});
  }
  const email=String(body.email??'').trim().toLowerCase(); const displayName=String(body.name??'').trim();
  if(!email||!email.includes('@')||!displayName) return NextResponse.json({ok:false,error:'Name and a valid email are required.'},{status:400});
  const user=await makeUser(displayName,email);
  if(await verifiedIdentityForWorkspace(user.userId))return NextResponse.json({ok:false,error:'This workspace is verified. Use “Continue to my workspace” and sign in with Supabase.'},{status:409});
  store.set(SESSION_COOKIE,await encodeSession(user),sessionCookieOptions);
  return NextResponse.json({ok:true,authenticated:true,user});
}
