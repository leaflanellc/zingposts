import { NextResponse } from 'next/server';
import { AGENT_GUIDE, AGENT_GUIDE_VERSION, WEBMCP_TOOL_CONTRACT_VERSION } from '@/lib/agent-guide';

export async function GET(){
  return NextResponse.json(
    {...AGENT_GUIDE,guideVersion:AGENT_GUIDE_VERSION,toolContractVersion:WEBMCP_TOOL_CONTRACT_VERSION},
    {headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}},
  );
}
