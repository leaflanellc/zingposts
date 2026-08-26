import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureDatabase } from '@/lib/scoutboard-store';
import { encodeSession, linkVerifiedIdentity, SESSION_COOKIE, sessionCookieOptions, currentUser, verifiedUserForAuthUser } from '@/lib/session';
import { supabaseAuthClient } from '@/lib/supabase-auth';

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;token?:string};
    const email=String(body.email??'').trim().toLowerCase(); const token=String(body.token??'').replace(/\s+/g,'');
    if(!email||!email.includes('@')||!/^[0-9]{6}$/.test(token))return NextResponse.json({ok:false,error:'Enter the email and six-digit code from Supabase.'},{status:400});
    const prototypeUser=await currentUser();
    const client=await supabaseAuthClient();
    const {data,error}=await client.auth.verifyOtp({email,token,type:'email'});
    if(error||!data.user)throw error??new Error('The verification code could not be confirmed.');
    let user=await verifiedUserForAuthUser(data.user.id);
    let upgraded=false;
    if(!user&&prototypeUser&&prototypeUser.authLevel!=='verified-human'){
      await ensureDatabase(prototypeUser);
      const linked=await linkVerifiedIdentity(prototypeUser,data.user.id,data.user.email??email);
      user=linked.user; upgraded=!linked.existing;
    }
    if(!user){await client.auth.signOut();return NextResponse.json({ok:false,error:'No Zingposts workspace is connected to this verified email. Create a prototype workspace first, then upgrade it.'},{status:404});}
    (await cookies()).set(SESSION_COOKIE,await encodeSession(user),sessionCookieOptions);
    return NextResponse.json({ok:true,authenticated:true,upgraded,user:{userId:user.userId,email:user.email,displayName:user.displayName,authLevel:user.authLevel}});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to verify the sign-in code.'},{status:400});
  }
}
