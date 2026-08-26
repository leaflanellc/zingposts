import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { authCallbackUrl } from '@/lib/site-url';
import { supabaseAuthClient } from '@/lib/supabase-auth';

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;intent?:'login'|'upgrade';name?:string};
    const email=String(body.email??'').trim().toLowerCase(); const intent=body.intent==='upgrade'?'upgrade':'login';
    if(!email||!email.includes('@'))return NextResponse.json({ok:false,error:'Enter a valid email address.'},{status:400});
    const workspaceUser=await currentUser();
    if(intent==='upgrade'&&(!workspaceUser||workspaceUser.authLevel==='verified-human'))return NextResponse.json({ok:false,error:'Open an unverified prototype workspace before upgrading it.'},{status:400});
    const client=await supabaseAuthClient(); const callbackUrl=authCallbackUrl(request);
    const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:intent==='upgrade',emailRedirectTo:callbackUrl,data:{display_name:workspaceUser?.displayName??String(body.name??'').trim(),zingposts_workspace_id:workspaceUser?.userId??null}}});
    if(error)throw error;
    console.info(JSON.stringify({event:'auth_link_requested',intent,callbackUrl}));
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
