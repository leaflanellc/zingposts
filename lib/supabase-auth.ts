import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from '@/lib/supabase-server';

function authKey(){
  const configured=process.env.SUPABASE_ANON_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if(configured)return configured;
  return supabaseConfig().serviceKey;
}

export async function supabaseAuthClient(){
  const cookieStore=await cookies();
  const {url}=supabaseConfig();
  return createServerClient(url,authKey(),{
    auth:{flowType:'pkce',autoRefreshToken:false,detectSessionInUrl:false,persistSession:true},
    cookieOptions:{path:'/',sameSite:'lax',secure:process.env.NODE_ENV==='production',httpOnly:true,maxAge:60*60*24*30},
    cookies:{
      getAll(){return cookieStore.getAll().map(({name,value})=>({name,value}))},
      setAll(cookiesToSet){for(const {name,value,options} of cookiesToSet)cookieStore.set(name,value,options)},
    },
  });
}

export async function currentSupabaseUser(){
  const client=await supabaseAuthClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)return null;
  return data.user;
}
