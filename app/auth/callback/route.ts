import { NextResponse } from 'next/server';
import { ensureDatabase } from '@/lib/scoutboard-store';
import { publicSiteOrigin } from '@/lib/site-url';
import { supabaseAuthClient } from '@/lib/supabase-auth';
import { currentUser, decodeAuthIntent, encodeSession, linkVerifiedIdentity, prototypeUserForVerification, SESSION_COOKIE, sessionCookieOptions, verifiedUserForAuthUser } from '@/lib/session';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const url=new URL(request.url); const code=url.searchParams.get('code'); const tokenHash=url.searchParams.get('token_hash'); const type=url.searchParams.get('type'); const destination=new URL('/',publicSiteOrigin(request));
  if(!code&&!tokenHash){console.warn(JSON.stringify({event:'auth_callback_incomplete'}));destination.searchParams.set('auth_error','The sign-in link is incomplete. Request a new email.');return NextResponse.redirect(destination)}
  try{
    const authIntent=await decodeAuthIntent(url.searchParams.get('intent')); const browserUser=await currentUser(); const supabase=await supabaseAuthClient();
    if(url.searchParams.has('intent')&&!authIntent)throw new Error('This sign-in request has expired. Request a fresh email.');
    const verification=tokenHash
      ? type==='email'?await supabase.auth.verifyOtp({token_hash:tokenHash,type:'email'}):{data:{user:null},error:new Error('The sign-in link has an unsupported verification type.')}
      : await supabase.auth.exchangeCodeForSession(code!);
    const {data,error}=verification; if(error||!data.user)throw error??new Error('Supabase did not return a verified user.');
    let prototypeUser=browserUser;
    if(authIntent?.mode==='upgrade'&&authIntent.workspaceUserId){
      if(prototypeUser&&prototypeUser.userId!==authIntent.workspaceUserId)throw new Error('This verification link belongs to a different prototype workspace.');
      prototypeUser??=await prototypeUserForVerification(authIntent.workspaceUserId);
    }
    let user=await verifiedUserForAuthUser(data.user.id); let upgraded=false;
    if(!user&&authIntent?.mode==='upgrade'&&prototypeUser&&prototypeUser.authLevel!=='verified-human'){
      await ensureDatabase(prototypeUser); const linked=await linkVerifiedIdentity(prototypeUser,data.user.id,data.user.email??prototypeUser.email); user=linked.user; upgraded=!linked.existing;
    }
    if(!user){await supabase.auth.signOut();throw new Error('This verified email is not connected to a Zingposts workspace. Open the prototype workspace first, then verify it there.');}
    console.info(JSON.stringify({event:'auth_callback_completed',upgraded}));
    const response=NextResponse.redirect(destination); response.cookies.set(SESSION_COOKIE,await encodeSession(user),sessionCookieOptions); if(upgraded)response.cookies.set('zingposts-just-verified','1',{path:'/',sameSite:'lax',maxAge:60,secure:process.env.NODE_ENV==='production'}); return response;
  }catch(cause){const message=cause instanceof Error?cause.message:'Unable to complete Supabase authentication.';console.error(JSON.stringify({event:'auth_callback_failed',message}));destination.searchParams.set('auth_error',message);return NextResponse.redirect(destination)}
}
