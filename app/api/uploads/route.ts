import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { uploadListingImage } from '@/lib/supabase-server';

export async function POST(request:Request){
  const user=await currentUser(); if(!user) return NextResponse.json({error:'Authentication required'},{status:401});
  const form=await request.formData(); const file=form.get('file'); if(!(file instanceof File)) return NextResponse.json({error:'A file is required'},{status:400});
  if(!file.type.startsWith('image/')||file.size>8_000_000) return NextResponse.json({error:'Use an image under 8 MB'},{status:400});
  const key=`${user.userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`; const url=await uploadListingImage(key,file); return NextResponse.json({key,url});
}
