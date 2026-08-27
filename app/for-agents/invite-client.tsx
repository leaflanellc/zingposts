'use client';

import { useEffect, useState } from 'react';

type Status='idle'|'connecting'|'connected'|'failed';

export default function AgentInviteClient(){
  const [status,setStatus]=useState<Status>('idle');
  const [message,setMessage]=useState('No private invite was included. Use the public WebMCP tools to start or ask the person for a new invite.');
  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.slice(1));
    const inviteToken=params.get('invite');
    if(!inviteToken)return;
    window.history.replaceState({},'',`${window.location.pathname}${window.location.search}`);
    let cancelled=false;
    queueMicrotask(()=>{
      if(cancelled)return;
      setStatus('connecting');setMessage('Exchanging the one-time invite for a revocable agent session…');
      fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'authenticate_agent',input:{inviteToken},actor:{type:'agent'}})})
        .then(async response=>{const body=await response.json();if(!response.ok||!body.ok)throw new Error(body.error?.message??'The invite could not be exchanged.');if(!cancelled){setStatus('connected');setMessage(`Connected as ${body.result.name}. Rediscover WebMCP tools and call get_agent_bootstrap.`);}})
        .catch(error=>{if(!cancelled){setStatus('failed');setMessage(error instanceof Error?error.message:'The invite could not be exchanged. Ask the person for a new link.');}});
    });
    return()=>{cancelled=true};
  },[]);
  return <section className={`agent-invite-status ${status}`} aria-live="polite"><span>{status==='connected'?'✓':status==='failed'?'!':status==='connecting'?'…':'↗'}</span><div><b>{status==='connected'?'Private agent session connected':status==='failed'?'Invite unavailable':status==='connecting'?'Connecting agent':'Public guide ready'}</b><p>{message}</p></div></section>;
}
