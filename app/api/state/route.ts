import { NextResponse } from 'next/server';
import { getGuestState, getOnboardingStatus, getState, runAction, runPublicAction } from '@/lib/scoutboard-store';
import { currentUser, workspaceUserForAgent } from '@/lib/session';
import { currentAgentSession, redeemAgentAuthCode, setAgentSessionCookie } from '@/lib/agent-auth';

function errorCode(error:unknown){
  const message=error instanceof Error?error.message:'';
  if(/agent authentication|agent code/i.test(message))return 'AGENT_AUTHENTICATION_REQUIRED';
  if(/authentication required|signed-in/i.test(message))return 'AUTHENTICATION_REQUIRED';
  if(/verification/i.test(message))return 'VERIFICATION_REQUIRED';
  if(/not found/i.test(message))return 'NOT_FOUND';
  if(/only the signed-in person|cannot confirm/i.test(message))return 'HUMAN_REQUIRED';
  if(/must be|use |required/i.test(message))return 'INVALID_INPUT';
  return 'ACTION_FAILED';
}

export async function GET(request:Request){ try { const user=await currentUser(); const setupSessionId=new URL(request.url).searchParams.get('setup')??''; if(!user){const agentSession=await currentAgentSession();return NextResponse.json({...await getGuestState(setupSessionId),agentAuthenticated:Boolean(agentSession),agentSession:agentSession?{agentId:agentSession.agentId,name:agentSession.name,expiresAt:agentSession.expiresAt}:null})} const state=await getState(user); return NextResponse.json({...state,authenticated:true,authMode:user.authLevel==='verified-human'?'supabase-email-link':process.env.NODE_ENV==='development'?'local-demo':'prototype',pendingSetup:setupSessionId?await getOnboardingStatus(setupSessionId):null}); } catch(error){ return NextResponse.json({error:error instanceof Error?error.message:'Unable to load Zingposts'},{status:401}); } }
export async function POST(request:Request){ try { const body=await request.json() as {action:string;input?:Record<string,unknown>;actor?:{type?:string;name?:string}}; const input=body.input??{};
    if(body.action==='authenticate_agent'){const redeemed=await redeemAgentAuthCode(String(input.code??''));await setAgentSessionCookie(redeemed.token);return NextResponse.json({ok:true,result:redeemed.session,meta:{action:body.action,toolContractVersion:'2026-08-26.5',idempotencyKey:null}})}
    let user=await currentUser(); let actor:{type:string;name:string};
    if(body.actor?.type==='agent'){
      const session=await currentAgentSession(user?.userId);
      if(user?.authLevel==='verified-human'&&!session)throw new Error('Agent authentication required. Ask the signed-in user for a new one-time agent code.');
      if(!user&&session)user=await workspaceUserForAgent(session.userId);
      actor={type:'agent',name:session?.name??String(body.actor.name??'Prototype WebMCP agent')};
    } else actor={type:'human',name:user?.displayName??'Zingposts user'};
    const result=user?await runAction(user,body.action,input,actor):await runPublicAction(body.action,input); return NextResponse.json({ok:true,result,meta:{action:body.action,toolContractVersion:'2026-08-26.5',idempotencyKey:input.idempotencyKey??null}}); } catch(error){ const code=errorCode(error); return NextResponse.json({ok:false,error:{code,message:error instanceof Error?error.message:'Zingposts action failed',retryable:code==='ACTION_FAILED'}},{status:code==='NOT_FOUND'?404:['AUTHENTICATION_REQUIRED','AGENT_AUTHENTICATION_REQUIRED'].includes(code)?401:400}); } }
