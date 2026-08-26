import { readListingImage } from '@/lib/supabase-server';

export async function GET(_:Request,{params}:{params:Promise<{key:string[]}>}){ const {key}=await params; const object=await readListingImage(key.join('/')); if(!object.ok||!object.body) return new Response('Not found',{status:404}); const headers=new Headers(); headers.set('content-type',object.headers.get('content-type')??'application/octet-stream'); headers.set('etag',object.headers.get('etag')??''); headers.set('cache-control','public, max-age=31536000, immutable'); return new Response(object.body,{headers}); }
