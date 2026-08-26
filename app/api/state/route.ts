import { NextResponse } from 'next/server';
import { getGuestState, getOnboardingStatus, getState, runAction, runPublicAction } from '@/lib/scoutboard-store';
import { currentUser } from '@/lib/session';

function errorCode(error:unknown){
  const message=error instanceof Error?error.message:'';
  if(/authentication required|signed-in/i.test(message))return 'AUTHENTICATION_REQUIRED';
  if(/verification/i.test(message))return 'VERIFICATION_REQUIRED';
  if(/not found/i.test(message))return 'NOT_FOUND';
  if(/only the signed-in person|cannot confirm/i.test(message))return 'HUMAN_REQUIRED';
  if(/must be|use |required/i.test(message))return 'INVALID_INPUT';
  return 'ACTION_FAILED';
}

export async function GET(request:Request){ try { const user=await currentUser(); const setupSessionId=new URL(request.url).searchParams.get('setup')??''; if(!user) return NextResponse.json(await getGuestState(setupSessionId)); const state=await getState(user); return NextResponse.json({...state,authenticated:true,authMode:process.env.NODE_ENV==='development'?'local-demo':'zingposts',pendingSetup:setupSessionId?await getOnboardingStatus(setupSessionId):null}); } catch(error){ return NextResponse.json({error:error instanceof Error?error.message:'Unable to load Zingposts'},{status:401}); } }
export async function POST(request:Request){ try { const body=await request.json() as {action:string;input?:Record<string,unknown>;actor?:{type?:string;name?:string}}; const user=await currentUser(); const result=user?await runAction(user,body.action,body.input??{},body.actor??{}):await runPublicAction(body.action,body.input??{}); return NextResponse.json({ok:true,result,meta:{action:body.action,toolContractVersion:'2026-08-26.2',idempotencyKey:body.input?.idempotencyKey??null}}); } catch(error){ const code=errorCode(error); return NextResponse.json({ok:false,error:{code,message:error instanceof Error?error.message:'Zingposts action failed',retryable:code==='ACTION_FAILED'}},{status:code==='NOT_FOUND'?404:code==='AUTHENTICATION_REQUIRED'?401:400}); } }
