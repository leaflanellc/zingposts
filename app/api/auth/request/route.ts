import { NextResponse } from 'next/server';
import { currentUser, encodeAuthIntent } from '@/lib/session';
import { authCallbackUrl } from '@/lib/site-url';
import { supabaseAuthClient } from '@/lib/supabase-auth';

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;intent?:'login'|'upgrade';name?:string};
    const email=String(body.email??'').trim().toLowerCase(); const intent=body.intent==='upgrade'?'upgrade':'login';
    if(!email||!email.includes('@'))return NextResponse.json({ok:false,error:'Enter a valid email address.'},{status:400});
    const workspaceUser=await currentUser();
    if(intent==='upgrade'&&(!workspaceUser||workspaceUser.authLevel==='verified-human'))return NextResponse.json({ok:false,error:'Open an unverified prototype workspace before upgrading it.'},{status:400});
    const client=await supabaseAuthClient(); const callbackUrl=new URL(authCallbackUrl(request));
    callbackUrl.searchParams.set('intent',await encodeAuthIntent(intent,workspaceUser?.userId));
    const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:intent==='upgrade',emailRedirectTo:callbackUrl.toString(),data:{display_name:workspaceUser?.displayName??String(body.name??'').trim()}}});
    if(error)throw error;
    console.info(JSON.stringify({event:'auth_link_requested',intent,callbackPath:callbackUrl.pathname}));
    return NextResponse.json({ok:true,email,intent,message:'Check your email for the secure sign-in link.'});
  }catch(error){
    const message=error instanceof Error?error.message:'Unknown authentication request error';
    const status=typeof error==='object'&&error!==null&&'status' in error&&Number(error.status)===429?429:400;
    const rateLimited=status===429||/rate limit/i.test(message);
    console.error(JSON.stringify({event:'auth_link_request_failed',reason:rateLimited?'rate_limited':'provider_error',status}));
    return NextResponse.json({
      ok:false,
      code:rateLimited?'EMAIL_RATE_LIMITED':'AUTH_LINK_REQUEST_FAILED',
      error:rateLimited
        ? 'Email sending is temporarily limited. Wait for the current hourly window to reset, then request one fresh link. Zingposts will not send another link until you ask.'
        : message,
    },{status:rateLimited?429:status,headers:rateLimited?{'Retry-After':'3600'}:undefined});
  }
}
