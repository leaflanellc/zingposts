export const AGENT_GUIDE_VERSION='2026-08-26.1';
export const WEBMCP_TOOL_CONTRACT_VERSION='2026-08-26.6';

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
    'Call get_agent_bootstrap once. It returns authentication, canonical agent identity, workspace overview, attention, active collaboration, capabilities, and guide version.',
    'Call activate_capability when a focused typed tool pack is needed. Capability activation does not navigate or change the person’s screen.',
    'Use open_for_human_review only when showing the person a listing, board, session, conversation, alert, or trade would help collaboration.',
  ],
  authentication:{
    agentFirst:'Use the public bootstrap and marketplace tools, then prepare a handoff for the person with start_agent_onboarding.',
    humanFirst:'Open the single-use invite URL supplied by the person. The fragment credential is exchanged once, removed immediately, and never stored.',
    fallback:'If an invite link cannot be opened, ask the person for a fresh ten-minute code and call authenticate_agent once.',
    persistence:'Verified agent sessions are separate from the human Supabase session, expire, and can be revoked.',
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
    'Call get_agent_bootstrap and resume from durable workspace identifiers and the attention queue.',
    'If authentication expired or was revoked, request a new invite or code from the person.',
  ],
  skillStarter:[
    'Open the saved Zingposts URL and rediscover WebMCP tools.',
    'Call get_agent_bootstrap before changing state.',
    'Activate only the capability needed for the current objective.',
    'Use Zingposts records as durable truth and preserve citations in research.',
    'Leave consequential actions for exact human review.',
    'Never store invite fragments, authentication codes, or stale tool catalogs.',
  ],
} as const;
