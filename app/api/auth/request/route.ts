import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseAuthClient } from '@/lib/supabase-auth';

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;intent?:'login'|'upgrade';name?:string};
    const email=String(body.email??'').trim().toLowerCase(); const intent=body.intent==='upgrade'?'upgrade':'login';
    if(!email||!email.includes('@'))return NextResponse.json({ok:false,error:'Enter a valid email address.'},{status:400});
    const workspaceUser=await currentUser();
    if(intent==='upgrade'&&(!workspaceUser||workspaceUser.authLevel==='verified-human'))return NextResponse.json({ok:false,error:'Open an unverified prototype workspace before upgrading it.'},{status:400});
    const client=await supabaseAuthClient(); const callbackUrl=new URL('/auth/callback',request.url).toString();
    const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:intent==='upgrade',emailRedirectTo:callbackUrl,data:{display_name:workspaceUser?.displayName??String(body.name??'').trim(),zingposts_workspace_id:workspaceUser?.userId??null}}});
    if(error)throw error;
    return NextResponse.json({ok:true,email,intent,message:'Check your email for the secure sign-in link.'});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to send the secure sign-in link.'},{status:400});
  }
}
