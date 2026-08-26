import { lookup } from 'node:dns/promises';

type SqlMode='query'|'execute';

function encodePlaceholders(statement:string,parameterCount:number){
  let rendered=''; let inString=false; let index=0;
  for(let position=0;position<statement.length;position+=1){
    const character=statement[position];
    if(character==="'"){
      if(inString&&statement[position+1]==="'"){rendered+="''";position+=1;continue;}
      inString=!inString; rendered+=character; continue;
    }
    if(character==='?'&&!inString){
      if(index>=parameterCount)throw new Error('Missing SQL parameter.');
      rendered+=`__ZINGPOSTS_PARAM_${index}__`; index+=1; continue;
    }
    rendered+=character;
  }
  if(index!==parameterCount)throw new Error('Too many SQL parameters.');
  return rendered;
}

function required(name:string){
  const value=process.env[name]?.trim();
  if(!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function supabaseConfig(){
  return {url:required('SUPABASE_URL').replace(/\/$/,''),serviceKey:required('SUPABASE_SERVICE_ROLE_KEY')};
}

export async function supabaseRequest(path:string,init:RequestInit={}){
  const {url,serviceKey}=supabaseConfig();
  return fetch(`${url}${path}`,{...init,headers:{apikey:serviceKey,authorization:`Bearer ${serviceKey}`,...init.headers}});
}

async function executeSql(statement:string,parameters:unknown[],mode:SqlMode){
  const encodedStatement=encodePlaceholders(statement,parameters.length);
  const response=await supabaseRequest('/rest/v1/rpc/scoutboard_sql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({statement:encodedStatement,parameters,query_mode:mode})});
  const body=await response.json().catch(()=>null) as unknown;
  if(!response.ok){
    const message=body&&typeof body==='object'&&'message' in body?String((body as {message:unknown}).message):`Supabase query failed (${response.status}).`;
    throw new Error(message);
  }
  return Array.isArray(body)?body:[];
}

class PreparedStatement{
  constructor(private readonly statement:string,private readonly parameters:unknown[]=[]){ }
  bind(...parameters:unknown[]){return new PreparedStatement(this.statement,parameters)}
  async all<T=Record<string,unknown>>(){return {results:await executeSql(this.statement,this.parameters,'query') as T[]}}
  async first<T=Record<string,unknown>>(){const rows=await executeSql(this.statement,this.parameters,'query') as T[];return rows[0]??null}
  async run(){await executeSql(this.statement,this.parameters,'execute');return {success:true}}
}

class SupabaseDatabase{
  prepare(statement:string){return new PreparedStatement(statement)}
  async batch(statements:PreparedStatement[]){const results=[];for(const statement of statements)results.push(await statement.run());return results}
}

const database=new SupabaseDatabase();
export function supabaseDatabase(){return database}

export async function uploadListingImage(key:string,file:Blob){
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  const response=await supabaseRequest(`/storage/v1/object/listing-media/${encoded}`,{method:'POST',headers:{'content-type':file.type,'x-upsert':'false'},body:await file.arrayBuffer()});
  if(!response.ok){const body=await response.json().catch(()=>null) as {message?:string}|null;throw new Error(body?.message??'Image upload failed.');}
  return `/api/uploads/${encoded}`;
}

const REMOTE_IMAGE_TYPES=new Map([
  ['image/jpeg','jpg'],
  ['image/png','png'],
  ['image/webp','webp'],
  ['image/gif','gif'],
]);

function isPrivateAddress(address:string){
  const normalized=address.toLowerCase();
  if(normalized==='::1'||normalized.startsWith('fc')||normalized.startsWith('fd')||normalized.startsWith('fe8')||normalized.startsWith('fe9')||normalized.startsWith('fea')||normalized.startsWith('feb'))return true;
  const ipv4=normalized.startsWith('::ffff:')?normalized.slice(7):normalized;
  const octets=ipv4.split('.').map(Number);
  if(octets.length!==4||octets.some(value=>!Number.isInteger(value)))return false;
  const [a,b]=octets;
  return a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a>=224;
}

async function assertPublicImageUrl(value:string){
  let url:URL;
  try{url=new URL(value);}catch{throw new Error('Image source must be a valid HTTPS URL.');}
  if(url.protocol!=='https:')throw new Error('Image source must use HTTPS.');
  if(url.username||url.password)throw new Error('Image source URLs cannot contain credentials.');
  const hostname=url.hostname.toLowerCase();
  if(hostname==='localhost'||hostname.endsWith('.local')||hostname.endsWith('.internal'))throw new Error('Image source must be a public HTTPS URL.');
  if(/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)||hostname.includes(':'))throw new Error('Image source must use a public hostname rather than an IP address.');
  const addresses=await lookup(hostname,{all:true}).catch(()=>[]);
  if(!addresses.length)throw new Error('The image source hostname could not be resolved.');
  if(addresses.some(({address})=>isPrivateAddress(address)))throw new Error('Image source must resolve only to public internet addresses.');
  return url;
}

export async function importListingImageFromUrl(keyPrefix:string,source:string){
  let url=await assertPublicImageUrl(source);
  let response:Response|null=null;
  for(let redirects=0;redirects<4;redirects+=1){
    response=await fetch(url,{redirect:'manual',headers:{accept:'image/jpeg,image/png,image/webp,image/gif'},signal:AbortSignal.timeout(12_000)});
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location)throw new Error('The image source redirected without a destination.');
      url=await assertPublicImageUrl(new URL(location,url).toString());
      continue;
    }
    break;
  }
  if(!response||response.status>=300&&response.status<400)throw new Error('The image source redirected too many times.');
  if(!response.ok)throw new Error(`The image source could not be downloaded (${response.status}).`);
  const mimeType=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  const extension=REMOTE_IMAGE_TYPES.get(mimeType);
  if(!extension)throw new Error('The image source must return a JPEG, PNG, WebP, or GIF image.');
  const declaredSize=Number(response.headers.get('content-length')??0);
  if(declaredSize>8_000_000)throw new Error('Use an image under 8 MB.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>8_000_000)throw new Error('Use an image under 8 MB.');
  const key=`${keyPrefix}-${crypto.randomUUID()}.${extension}`;
  const storedUrl=await uploadListingImage(key,new Blob([bytes],{type:mimeType}));
  return {url:storedUrl,key,sourceUrl:url.toString(),mimeType,bytes:bytes.byteLength};
}

export async function readListingImage(key:string){
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  return supabaseRequest(`/storage/v1/object/listing-media/${encoded}`);
}
