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

export async function uploadListingImage(key:string,file:File){
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  const response=await supabaseRequest(`/storage/v1/object/listing-media/${encoded}`,{method:'POST',headers:{'content-type':file.type,'x-upsert':'false'},body:await file.arrayBuffer()});
  if(!response.ok){const body=await response.json().catch(()=>null) as {message?:string}|null;throw new Error(body?.message??'Image upload failed.');}
  return `/api/uploads/${encoded}`;
}

export async function readListingImage(key:string){
  const encoded=key.split('/').map(encodeURIComponent).join('/');
  return supabaseRequest(`/storage/v1/object/listing-media/${encoded}`);
}
