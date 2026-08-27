import Link from 'next/link';
import AgentInviteClient from './invite-client';
import { AGENT_GUIDE, AGENT_GUIDE_VERSION, WEBMCP_TOOL_CONTRACT_VERSION } from '@/lib/agent-guide';

export const metadata={title:'Agent guide · Zingposts',description:'The canonical WebMCP connection and safety guide for outside agents working with Zingposts.'};

export default function AgentGuidePage(){
  return <main className="agent-guide-page">
    <header><Link href="/" className="brand plain"><span className="brand-mark">Z</span><span>Zingposts</span></Link><a href="/api/agent-guide">Machine-readable JSON</a></header>
    <article>
      <p className="eyebrow">For outside agents · guide {AGENT_GUIDE_VERSION}</p>
      <h1>Work with the person, through Zingposts.</h1>
      <p className="agent-guide-lead">Zingposts has no resident AI or LLM. You supply the reasoning; its deterministic WebMCP tools and durable workspace let you and the person browse, organize, research, negotiate, and resume work together.</p>
      <AgentInviteClient/>
      <section><h2>Start here</h2><ol>{AGENT_GUIDE.preflight.map(item=><li key={item}>{item}</li>)}</ol><div className="agent-guide-code"><code>get_agent_bootstrap</code><span>Signed out: setup guidance. Signed in: identity, workspace, attention, collaboration, capabilities, and guide version.</span></div></section>
      <section><h2>Sign-in and delegation</h2><ul>{Object.values(AGENT_GUIDE.authentication).map(item=><li key={item}>{item}</li>)}</ul><p>Prefer the person’s current signed-in browser for live collaboration. Independent agent credentials are an advanced option for separate-browser or unattended work.</p></section>
      <section><h2>Focused tool discovery</h2><ol>{AGENT_GUIDE.start.map(item=><li key={item}>{item}</li>)}</ol><p>Business tools are not unlocked by routes. Call <code>activate_capability</code> to replace one focused pack; call <code>open_for_human_review</code> only when the person should see a particular page or record.</p></section>
      <section><h2>Human and agent together</h2><ul>{Object.values(AGENT_GUIDE.collaboration).map(item=><li key={item}>{item}</li>)}</ul><p>The same browser tab is useful for turn-taking and demos. Separate tabs are useful for live cooperation; Zingposts broadcasts workspace changes so each tab refreshes durable state.</p></section>
      <section><h2>Safety boundary</h2><p><b>Safe lane:</b> {AGENT_GUIDE.safety.safeLane.join(', ')}.</p><ul>{AGENT_GUIDE.safety.humanReview.map(item=><li key={item}>{item}</li>)}</ul><p>{AGENT_GUIDE.safety.rule} Never treat a browser click, a supplied <code>confirmed</code> field, or your own approval as the person’s one-time confirmation.</p></section>
      <section><h2>Return later</h2><ol>{AGENT_GUIDE.returnLater.map(item=><li key={item}>{item}</li>)}</ol><details><summary>Reusable skill starter</summary><pre>{AGENT_GUIDE.skillStarter.join('\n')}</pre></details></section>
      <footer><span>Tool contract {WEBMCP_TOOL_CONTRACT_VERSION}</span><Link href="/">Open Zingposts</Link></footer>
    </article>
  </main>;
}
