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
  assert.equal(response.ok, true, `${name} failed: ${body.error?.message ?? body.error ?? response.status}`);
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
  assert.equal(response.ok, true, `${name} public call failed: ${body.error?.message ?? body.error ?? response.status}`);
  assert.equal(body.ok, true, `${name} public call returned ok=false`);
  return body.result;
}

async function workspaceState() {
  const response = await fetch(`${base}/api/state`, { headers: { cookie: sessionCookie } });
  assert.equal(response.ok, true, 'GET /api/state failed');
  return response.json();
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
assert.equal(capabilities.tools.length, 95, 'expected the complete authenticated WebMCP catalog');
assert.equal(capabilities.publicTools.length, 11, 'expected the signed-out discovery and onboarding catalog');
assert.equal(capabilities.architecture.builtInAI, false);
assert.equal(capabilities.architecture.webmcpConnectionPersistent, false);
assert.equal(capabilities.architecture.seamlessSafeAgentConnection, true);
assert.equal(capabilities.supports.trades, true);
assert.equal(capabilities.supports.undo, true);
assert.deepEqual(capabilities.supports.sharedCanvasViews, ['gallery', 'focus', 'thumbnails']);
assert.equal(capabilities.supports.canvasControlSurface, 'left-rail');
assert.equal(capabilities.supports.humanBoardInteraction, 'drag-to-left-rail');
assert.equal(capabilities.supports.sharedHumanAgentWorkbench, true);
assert.equal(capabilities.supports.idempotencyKeys, true);
assert.equal(capabilities.supports.structuredErrors, true);
assert.equal(capabilities.supports.agentImageIngestion, true);
assert.equal(capabilities.supports.resumableWorkspaceInventory, true);
assert.equal(capabilities.supports.untrustedContentAnnotations, true);

const manifest = await publicAction('get_webmcp_manifest');
assert.ok(manifest.groups.some((group) => group.id === 'views' && group.tools.includes('set_marketplace_view')));
assert.ok(manifest.groups.some((group) => group.id === 'organization' && group.tools.includes('add_listings_to_board')));
assert.ok(manifest.groups.some((group) => group.id === 'collaboration' && group.tools.includes('add_collaboration_item')));
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
const boatSearch = await action('search_marketplace', { query: 'boat' });
assert.ok(boatSearch.count >= 4, 'category and synonym search should find boats');
const interpretedAlert = await publicAction('interpret_alert', { query: 'Vintage boats', criteria: { maxPrice: 20000, beforeYear: 1990 } });
assert.equal(interpretedAlert.interpretation.criteria.category, 'Boats');
assert.ok(interpretedAlert.previewCount >= 4, 'natural-language alert interpretation should find matching boats');

const comparison = await action('compare_listings', { listingIds: search.results.slice(0, 3).map((item) => item.id) });
assert.equal(comparison.comparison.length, 3);

const runId = Date.now().toString(36);
const overview = await action('get_workspace_overview');
assert.ok(overview.counts.boards >= 3, 'workspace overview should expose durable board inventory');
assert.equal(overview.entryPoints.myListings, 'list_my_listings');
const existingBoards = await action('list_boards');
assert.ok(existingBoards.boards.every((item) => item.id && Array.isArray(item.items)), 'boards should be resumable without prior IDs');
const existingSaved = await action('list_saved_items');
assert.ok(Array.isArray(existingSaved.items));
const privateTagTarget = search.results[0].id;
const privateTags = await action('tag_listings', { listingIds: [privateTagTarget], tags: [`smoke-${runId}`] });
assert.equal(privateTags.private, true);
const taggedSaved = await action('list_saved_items');
assert.ok(taggedSaved.items.some((item) => item.id === privateTagTarget && item.tags.includes(`smoke-${runId}`)), 'private tags should remain in user workspace metadata');
const boardKey = `board-${runId}`;
const board = await action('create_board', { name: `Smoke board ${runId}`, description: 'Temporary verification board', color: '#3d6955', idempotencyKey: boardKey });
const boardReplay = await action('create_board', { name: `Smoke board ${runId}`, description: 'Temporary verification board', color: '#3d6955', idempotencyKey: boardKey });
assert.equal(boardReplay.boardId, board.boardId, 'idempotent replay must return the original record');
assert.equal(boardReplay.replayed, true);
const selectedIds = search.results.slice(0, 2).map((item) => item.id);
const organized = await action('add_listings_to_board', { boardId: board.boardId, listingIds: selectedIds, notes: 'Automated smoke test' });
assert.equal(organized.count, selectedIds.length);
const removed = await action('remove_listings_from_board', { boardId: board.boardId, listingIds: [selectedIds[0]] });
assert.equal(removed.removed, 1, 'a listing should be removable from a board');
const afterRemoval = await workspaceState();
assert.ok(!afterRemoval.boardItems.some((item) => item.board_id === board.boardId && item.listing_id === selectedIds[0]), 'removed listing should no longer be a board member');
await action('add_listings_to_board', { boardId: board.boardId, listingIds: [selectedIds[0]], notes: 'Restored after removal smoke test' });

const collaboration = await action('start_collaboration_session', { agentName: 'Smoke test agent', objective: `Choose the strongest vintage boat ${runId}`, listingIds: selectedIds, constraints: { maxPrice: 20000 } });
const recommendation = await action('add_collaboration_item', { sessionId: collaboration.sessionId, kind: 'recommendation', title: 'Best inspection candidate', body: 'The Whaler has the strongest record, but the original fuel tank needs an in-person check.', listingIds: ['lst_whaler','lst_chris'], options: ['Prioritize Whaler','Compare again'], requiresHumanResponse: true });
assert.equal(recommendation.status, 'open');
const attention = await action('get_human_attention_queue');
assert.ok(attention.collaborationItems.some((item) => item.id === recommendation.itemId));
const humanResponse = await action('respond_to_collaboration_item', { itemId: recommendation.itemId, decision: 'accepted', response: 'Prioritize the Whaler and prepare an inspection checklist.' }, { type: 'human', name: 'Smoke test human' });
assert.equal(humanResponse.agentCanContinue, true);
const collaborationState = await action('get_collaboration_session', { sessionId: collaboration.sessionId });
assert.equal(collaborationState.items.find((item) => item.id === recommendation.itemId).status, 'accepted');
const resumableSessions = await action('list_collaboration_sessions');
assert.ok(resumableSessions.sessions.some((item) => item.id === collaboration.sessionId), 'collaboration sessions should be discoverable after creation');
await action('update_collaboration_session', { sessionId: collaboration.sessionId, status: 'complete', summary: 'Human chose the Whaler for the next inspection step.' });

const listingDraft = await action('create_listing_draft', { title: `Smoke listing ${runId}`, category: 'Boats', price: 1200, location: 'Richmond, VA', description: 'Unpublished trust-boundary test.' });
const imageSource = process.env.ZINGPOSTS_TEST_IMAGE_URL ?? 'https://zingposts.com/images/cape-dory.jpg';
const listingImage = await action('attach_listing_image_from_url', { listingId: listingDraft.listingId, sourceUrl: imageSource, sourceLabel: 'Zingposts test fixture', altText: 'A classic sailboat underway.' });
assert.match(listingImage.image, /^\/api\/uploads\//, 'agent image ingestion should copy the image into Zingposts storage');
const ownedListings = await action('list_my_listings', { status: 'draft' });
assert.ok(ownedListings.listings.some((item) => item.id === listingDraft.listingId && item.image === listingImage.image), 'owned draft inventory should include the stored image');
const attemptedPublishByUpdate = await action('update_listing_draft', { listingId: listingDraft.listingId, status: 'published', title: `Smoke listing ${runId}` });
assert.equal(attemptedPublishByUpdate.status, 'draft', 'generic listing updates must not bypass the protected publish workflow');
const publishGate = await action('request_listing_publish', { listingId: listingDraft.listingId, confirmed: true });
assert.equal(publishGate.confirmationRequired, true, 'an agent must not self-publish a listing');
assert.equal(publishGate.humanRequired, true);

const alert = await action('create_alert_draft', { name: `Smoke alert ${runId}`, query: '', criteria: { maxPrice: 15000, beforeYear: 1980 } });
const alertInventory = await action('list_alerts');
assert.ok(alertInventory.alerts.some((item) => item.id === alert.alertId), 'alert drafts should be discoverable after creation');
const gate = await action('enable_alert', { alertId: alert.alertId });
assert.equal(gate.confirmationRequired, true, 'alert activation must stop for human confirmation');
const enabled = await action('enable_alert', { alertId: alert.alertId, confirmed: true }, { type: 'human', name: 'Smoke test human' });
assert.equal(enabled.status, 'active');

const draft = await action('draft_seller_message', { listingId: 'lst_whaler', body: 'Smoke-test message draft; do not send.' });
assert.equal(draft.status, 'draft');
const messageDryRun = await action('request_message_send', { messageId: draft.messageId, dryRun: true });
assert.equal(messageDryRun.dryRun, true);
assert.equal(messageDryRun.sideEffects.length, 0);
const messageGate = await action('request_message_send', { messageId: draft.messageId });
assert.equal(messageGate.confirmationRequired, true, 'message sending must stop for human confirmation');
const selfConfirmation = await action('request_message_send', { messageId: draft.messageId, confirmed: true });
assert.equal(selfConfirmation.confirmationRequired, true, 'an agent must not approve its own outbound action');
assert.equal(selfConfirmation.humanRequired, true);
const verification = await action('complete_account_verification', { email: initial.user.email }, { type: 'human', name: 'Smoke test human' });
assert.equal(verification.verification.status, 'verified');
await action('request_message_send', { messageId: draft.messageId, confirmed: true }, { type: 'human', name: 'Smoke test human' });
const inbox = await action('list_conversations');
assert.ok(inbox.conversations.some((item) => item.conversation.id === draft.conversationId), 'conversation inventory should preserve resumable message context');
const research = await action('get_listing_research', { listingId: 'lst_whaler' });
assert.ok(Array.isArray(research.notes), 'listing research should be readable through WebMCP');
const tradeRooms = await action('list_trade_rooms');
assert.ok(Array.isArray(tradeRooms.tradeRooms), 'trade rooms should be discoverable through WebMCP');

const recent = await action('list_recent_agent_actions', { limit: 40 });
const boardEvent = recent.activities.find((item) => item.action === 'create_board' && item.entity_id === board.boardId);
assert.ok(boardEvent, 'board creation should appear in the activity ledger');
const undone = await action('undo_agent_action', { activityId: boardEvent.id }, { type: 'human', name: 'Smoke test human' });
assert.equal(undone.undone, true);
const collaborationEvent = recent.activities.find((item) => item.action === 'start_collaboration_session' && item.entity_id === collaboration.sessionId);
assert.ok(collaborationEvent, 'collaboration session should appear in the activity ledger');
await action('undo_agent_action', { activityId: collaborationEvent.id }, { type: 'human', name: 'Smoke test human' });

console.log(JSON.stringify({
  ok: true,
  seededListings: initial.listings.length,
  webmcpTools: capabilities.tools.length,
  searchMatches: search.count,
  confirmationGates: ['enable_alert', 'request_message_send'],
  trustLanes: ['immediate safe workspace', 'verified human outbound actions'],
  interfacePreferences: ['canvas-first left rail', 'fullscreen details', 'collapsible navigation', 'gallery/focus/thumbnail canvas'],
  webmcpOrganization: ['views', 'queries', 'actions', 'workflows'],
  collaborationLoop: ['agent opens session', 'agent requests human decision', 'human responds', 'agent continues'],
  onboardingPaths: ['agent first', 'person first'],
  builtInAI: false,
  undoVerified: true,
}, null, 2));
