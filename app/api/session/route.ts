import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encodeSession, makeUser, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(request:Request){
  const body=await request.json() as {mode?:string;name?:string;email?:string};
  const store=await cookies();
  if(body.mode==='logout'){
    store.set(SESSION_COOKIE,'anonymous',sessionCookieOptions);
    return NextResponse.json({ok:true,authenticated:false});
  }
  const email=String(body.email??'').trim().toLowerCase(); const displayName=String(body.name??'').trim();
  if(!email||!email.includes('@')||!displayName) return NextResponse.json({ok:false,error:'Name and a valid email are required.'},{status:400});
  const user=await makeUser(displayName,email);
  store.set(SESSION_COOKIE,await encodeSession(user),sessionCookieOptions);
  return NextResponse.json({ok:true,authenticated:true,user});
}
