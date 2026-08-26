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
    console.error(JSON.stringify({event:'auth_link_request_failed',message:error instanceof Error?error.message:'Unknown authentication request error'}));
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to send the secure sign-in link.'},{status:400});
  }
}
