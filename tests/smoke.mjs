import assert from 'node:assert/strict';

const base = process.env.ZINGPOSTS_URL ?? 'http://localhost:3000';
const smokeIdentity = {
  name: 'Zingposts smoke tester',
  email: 'smoke-test@zingposts.com',
};

const sessionResponse = await fetch(`${base}/api/session`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(smokeIdentity),
});
assert.equal(sessionResponse.ok, true, 'POST /api/session failed');
const sessionCookie = sessionResponse.headers.getSetCookie?.()[0]?.split(';')[0]
  ?? sessionResponse.headers.get('set-cookie')?.split(';')[0];
assert.ok(sessionCookie, 'sign-in did not return a session cookie');

async function action(name, input = {}, actor = { type: 'agent', name: 'Smoke test agent' }) {
  const response = await fetch(`${base}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: sessionCookie },
    body: JSON.stringify({ action: name, input, actor }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${name} failed: ${body.error ?? response.status}`);
  assert.equal(body.ok, true, `${name} returned ok=false`);
  return body.result;
}

async function publicAction(name, input = {}) {
  const response = await fetch(`${base}/api/state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'zingposts-session=anonymous' },
    body: JSON.stringify({ action: name, input, actor: { type: 'agent', name: 'Anonymous smoke agent' } }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${name} public call failed: ${body.error ?? response.status}`);
  assert.equal(body.ok, true, `${name} public call returned ok=false`);
  return body.result;
}

const initialResponse = await fetch(`${base}/api/state`, { headers: { cookie: sessionCookie } });
assert.equal(initialResponse.ok, true, 'GET /api/state failed');
const initial = await initialResponse.json();
assert.ok(initial.listings.length >= 12, 'expected a realistic seeded marketplace');
assert.ok(initial.boards.length >= 3, 'expected seeded boards');

const auth = await action('get_auth_status');
assert.equal(auth.authenticated, true);

const interfaceBefore = await action('get_interface_preferences');
assert.equal(interfaceBefore.preferences.detailView, 'fullscreen');
const focusView = await action('set_marketplace_view', { mode: 'focus', category: 'Boats', filtersExpanded: false });
assert.equal(focusView.view.mode, 'focus');
assert.equal(focusView.view.category, 'Boats');
const marketplaceView = await action('get_marketplace_view');
assert.deepEqual(marketplaceView.availableModes, ['gallery', 'focus', 'thumbnails']);
assert.equal(marketplaceView.view.controlSurface, 'left-rail');
await action('set_marketplace_view', { mode: 'gallery', category: 'All', filtersExpanded: false });
const collapsed = await action('set_navigation_collapsed', { collapsed: true });
assert.equal(collapsed.preferences.sidebarCollapsed, true);
const expanded = await action('set_navigation_collapsed', { collapsed: false });
assert.equal(expanded.preferences.sidebarCollapsed, false);

const capabilities = await action('get_site_capabilities');
assert.equal(capabilities.tools.length, 78, 'expected the complete authenticated WebMCP catalog');
assert.equal(capabilities.publicTools.length, 10, 'expected the signed-out discovery and onboarding catalog');
assert.equal(capabilities.architecture.builtInAI, false);
assert.equal(capabilities.architecture.webmcpConnectionPersistent, false);
assert.equal(capabilities.architecture.seamlessSafeAgentConnection, true);
assert.equal(capabilities.supports.trades, true);
assert.equal(capabilities.supports.undo, true);
assert.deepEqual(capabilities.supports.sharedCanvasViews, ['gallery', 'focus', 'thumbnails']);
assert.equal(capabilities.supports.canvasControlSurface, 'left-rail');
assert.equal(capabilities.supports.humanBoardInteraction, 'drag-to-left-rail');

const manifest = await publicAction('get_webmcp_manifest');
assert.ok(manifest.groups.some((group) => group.id === 'views' && group.tools.includes('set_marketplace_view')));
assert.ok(manifest.groups.some((group) => group.id === 'organization' && group.tools.includes('add_listings_to_board')));
assert.deepEqual(new Set(manifest.groups.flatMap((group) => group.tools)), new Set(capabilities.tools), 'manifest should organize every WebMCP tool exactly once');

const guide = await publicAction('get_connection_guide');
assert.equal(guide.persistence.webmcp, 'page-scoped');
assert.equal(guide.architecture.builtInAI, false);

const publicConnection = await publicAction('connect_agent', { name: `Public smoke ${Date.now()}` });
assert.equal(publicConnection.status, 'connected_public');
assert.equal(publicConnection.approvalRequired, false);

const agentFirst = await publicAction('start_agent_onboarding', { agentName: `Agent-first smoke ${Date.now()}`, scopes: ['marketplace:read', 'workspace:write'], preferences: { categories: ['Boats'] } });
assert.equal(agentFirst.status, 'awaiting_user');
assert.equal(agentFirst.approvalRequired, false);
const guestResponse = await fetch(`${base}/api/state?setup=${agentFirst.setupSessionId}`, { headers: { cookie: 'zingposts-session=anonymous' } });
const guest = await guestResponse.json();
assert.equal(guest.authenticated, false);
assert.equal(guest.pendingSetup.status, 'awaiting_user');
const agentFirstApproved = await action('approve_agent_onboarding', { setupSessionId: agentFirst.setupSessionId }, { type: 'human', name: 'Smoke test human' });
assert.equal(agentFirstApproved.status, 'active');
await action('revoke_agent', { agentId: agentFirstApproved.agentId }, { type: 'human', name: 'Smoke test human' });

const personFirst = await action('start_agent_pairing', { name: `Person-first smoke ${Date.now()}`, scopes: ['marketplace:read', 'research:write'] });
assert.equal(personFirst.status, 'active');
assert.equal(personFirst.approvalRequired, false);
await action('revoke_agent', { agentId: personFirst.agentId }, { type: 'human', name: 'Smoke test human' });

const seamless = await action('connect_agent', { name: `Seamless smoke ${Date.now()}` });
assert.equal(seamless.status, 'active');
assert.equal(seamless.access, 'safe_workspace');
assert.equal(seamless.approvalRequired, false);

const search = await action('search_marketplace', { query: '', maxPrice: 15000, beforeYear: 1980 });
assert.ok(search.count >= 3, 'structured marketplace search returned too few results');

const comparison = await action('compare_listings', { listingIds: search.results.slice(0, 3).map((item) => item.id) });
assert.equal(comparison.comparison.length, 3);

const runId = Date.now().toString(36);
const board = await action('create_board', { name: `Smoke board ${runId}`, description: 'Temporary verification board', color: '#3d6955' });
const selectedIds = search.results.slice(0, 2).map((item) => item.id);
const organized = await action('add_listings_to_board', { boardId: board.boardId, listingIds: selectedIds, notes: 'Automated smoke test' });
assert.equal(organized.count, selectedIds.length);

const listingDraft = await action('create_listing_draft', { title: `Smoke listing ${runId}`, category: 'Boats', price: 1200, location: 'Richmond, VA', description: 'Unpublished trust-boundary test.' });
const attemptedPublishByUpdate = await action('update_listing_draft', { listingId: listingDraft.listingId, status: 'published', title: `Smoke listing ${runId}` });
assert.equal(attemptedPublishByUpdate.status, 'draft', 'generic listing updates must not bypass the protected publish workflow');
const publishGate = await action('request_listing_publish', { listingId: listingDraft.listingId, confirmed: true });
assert.equal(publishGate.confirmationRequired, true, 'an agent must not self-publish a listing');
assert.equal(publishGate.humanRequired, true);

const alert = await action('create_alert_draft', { name: `Smoke alert ${runId}`, query: '', criteria: { maxPrice: 15000, beforeYear: 1980 } });
const gate = await action('enable_alert', { alertId: alert.alertId });
assert.equal(gate.confirmationRequired, true, 'alert activation must stop for human confirmation');
const enabled = await action('enable_alert', { alertId: alert.alertId, confirmed: true }, { type: 'human', name: 'Smoke test human' });
assert.equal(enabled.status, 'active');

const draft = await action('draft_seller_message', { listingId: 'lst_whaler', body: 'Smoke-test message draft; do not send.' });
assert.equal(draft.status, 'draft');
const messageGate = await action('request_message_send', { messageId: draft.messageId });
assert.equal(messageGate.confirmationRequired, true, 'message sending must stop for human confirmation');
const selfConfirmation = await action('request_message_send', { messageId: draft.messageId, confirmed: true });
assert.equal(selfConfirmation.confirmationRequired, true, 'an agent must not approve its own outbound action');
assert.equal(selfConfirmation.humanRequired, true);
const verification = await action('complete_account_verification', { email: initial.user.email }, { type: 'human', name: 'Smoke test human' });
assert.equal(verification.verification.status, 'verified');
await action('request_message_send', { messageId: draft.messageId, confirmed: true }, { type: 'human', name: 'Smoke test human' });

const recent = await action('list_recent_agent_actions', { limit: 40 });
const boardEvent = recent.activities.find((item) => item.action === 'create_board' && item.entity_id === board.boardId);
assert.ok(boardEvent, 'board creation should appear in the activity ledger');
const undone = await action('undo_agent_action', { activityId: boardEvent.id }, { type: 'human', name: 'Smoke test human' });
assert.equal(undone.undone, true);

console.log(JSON.stringify({
  ok: true,
  seededListings: initial.listings.length,
  webmcpTools: capabilities.tools.length,
  searchMatches: search.count,
  confirmationGates: ['enable_alert', 'request_message_send'],
  trustLanes: ['immediate safe workspace', 'verified human outbound actions'],
  interfacePreferences: ['canvas-first left rail', 'fullscreen details', 'collapsible navigation', 'gallery/focus/thumbnail canvas'],
  webmcpOrganization: ['views', 'queries', 'actions', 'workflows'],
  onboardingPaths: ['agent first', 'person first'],
  builtInAI: false,
  undoVerified: true,
}, null, 2));
