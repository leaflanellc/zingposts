import { NextResponse } from 'next/server';
import { ensureDatabase } from '@/lib/scoutboard-store';
import { supabaseAuthClient } from '@/lib/supabase-auth';
import { currentUser, encodeSession, linkVerifiedIdentity, SESSION_COOKIE, sessionCookieOptions, verifiedUserForAuthUser } from '@/lib/session';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const url=new URL(request.url); const code=url.searchParams.get('code'); const destination=new URL('/',url.origin);
  if(!code){destination.searchParams.set('auth_error','The sign-in link is incomplete. Request a new email.');return NextResponse.redirect(destination)}
  try{
    const prototypeUser=await currentUser(); const supabase=await supabaseAuthClient();
    const {data,error}=await supabase.auth.exchangeCodeForSession(code); if(error||!data.user)throw error??new Error('Supabase did not return a verified user.');
    let user=await verifiedUserForAuthUser(data.user.id); let upgraded=false;
    if(!user&&prototypeUser&&prototypeUser.authLevel!=='verified-human'){
      await ensureDatabase(prototypeUser); const linked=await linkVerifiedIdentity(prototypeUser,data.user.id,data.user.email??prototypeUser.email); user=linked.user; upgraded=!linked.existing;
    }
    if(!user){await supabase.auth.signOut();throw new Error('This verified email is not connected to a Zingposts workspace. Open the prototype workspace first, then verify it there.');}
    const response=NextResponse.redirect(destination); response.cookies.set(SESSION_COOKIE,await encodeSession(user),sessionCookieOptions); if(upgraded)response.cookies.set('zingposts-just-verified','1',{path:'/',sameSite:'lax',maxAge:60,secure:process.env.NODE_ENV==='production'}); return response;
  }catch(cause){destination.searchParams.set('auth_error',cause instanceof Error?cause.message:'Unable to complete Supabase authentication.');return NextResponse.redirect(destination)}
}
