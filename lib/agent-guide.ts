export const AGENT_GUIDE_VERSION='2026-08-27.1';
export const WEBMCP_TOOL_CONTRACT_VERSION='2026-08-27.1';

export const AGENT_GUIDE={
  name:'Zingposts outside-agent guide',
  version:AGENT_GUIDE_VERSION,
  canonicalPath:'/for-agents',
  machineReadablePath:'/api/agent-guide',
  purpose:'Zingposts is a deterministic marketplace and durable shared workspace. It contains no built-in AI; reasoning remains in the user’s outside agent.',
  architecture:{
    builtInAI:false,
    webmcp:'document-scoped',
    registration:'persistent core plus a navigation-independent activated capability pack',
    durableState:'backend-backed stable resource identifiers',
    navigation:'optional and only for showing the person a useful view',
  },
  preflight:[
    'Open Zingposts in a browser tab the agent can control and discover document.modelContext tools.',
    'If WebMCP is unavailable, tell the person whether the browser or the agent runtime lacks support; do not pretend to be connected.',
    'Use Zingposts WebMCP tools for workspace changes instead of DOM automation.',
  ],
  start:[
    'Call get_agent_bootstrap once. While signed out it returns only setup guidance. After the person signs in, rediscover tools and call it again to resume the workspace.',
    'Call get_workspace_resume before creating new work. It returns changes since this agent’s durable checkpoint, structured blockers, proposals, and safe next actions.',
    'Call activate_capability when a focused typed tool pack is needed. Capability activation does not navigate or change the person’s screen.',
    'Use open_for_human_review only when showing the person a listing, board, session, conversation, alert, or trade would help collaboration.',
  ],
  authentication:{
    signedOut:'Only setup tools are available. Call get_agent_bootstrap, then start_agent_onboarding if the person has not opened a workspace yet.',
    sameBrowser:'Once the person signs in, safe private tools become available in that browser document. Calls are attributed as a browser agent acting through the signed-in person; no extra agent code is required.',
    unattended:'For a separate browser or work that must continue without the person’s signed-in tab, use a one-use invite or fallback code to create an expiring, revocable agent session.',
    persistence:'The workspace persists. Browser-delegated access ends with the person’s browser session; independent agent sessions expire or can be revoked.',
  },
  collaboration:{
    sameTab:'Backend-backed actions may run without navigation while the person browses. The visible state updates after agent changes.',
    separateTab:'Use a separate agent-controlled tab when visual navigation would interrupt the person or for longer-running work.',
    concurrency:'Read resource versions and include expectedVersion on overwriting updates. Refresh after a CONFLICT result.',
  },
  safety:{
    safeLane:['search','compare','organize','research','draft','plan','preview'],
    humanReview:['publish a listing','change public listing media','send a message','submit or respond to an offer','invite a trade participant','enable notifications','delete a QA run'],
    rule:'Never approve the agent’s own consequential request or bypass Zingposts verification and human review.',
  },
  returnLater:[
    'Reopen Zingposts and rediscover the current WebMCP registry; do not rely on a cached catalog.',
    'Call get_agent_bootstrap, then get_workspace_resume. Acknowledge a new checkpoint only after the returned changes have been processed.',
    'If the person is signed out, ask them to sign in. Use a fresh invite or code only for unattended or separate-browser access.',
  ],
  skillStarter:[
    'Open the saved Zingposts URL and rediscover WebMCP tools.',
    'Call get_agent_bootstrap before changing state.',
    'Call get_workspace_resume and process pending human responses, blockers, and proposed change sets before creating duplicates.',
    'Activate only the capability needed for the current objective.',
    'Use Zingposts records as durable truth and preserve citations in research.',
    'Leave consequential actions for exact human review.',
    'Never store invite fragments, authentication codes, or stale tool catalogs.',
  ],
} as const;
