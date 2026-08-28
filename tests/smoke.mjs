import assert from 'node:assert/strict';

const base=process.env.ZINGPOSTS_URL??'http://localhost:3000';
const runLabel=Date.now().toString(36);
const sessionResponse=await fetch(`${base}/api/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Zingposts QA runner',email:`qa-${runLabel}@example.test`})});
assert.equal(sessionResponse.ok,true,'prototype QA workspace creation failed');
const sessionCookie=sessionResponse.headers.getSetCookie?.()[0]?.split(';')[0]??sessionResponse.headers.get('set-cookie')?.split(';')[0];
assert.ok(sessionCookie,'workspace session cookie missing');

async function request(name,input={},actor={type:'agent',name:'Untrusted QA label'},cookie=sessionCookie){
  const response=await fetch(`${base}/api/state`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({action:name,input,actor})});
  const body=await response.json();return {response,body};
}
async function action(name,input={},actor){const result=await request(name,input,actor);assert.equal(result.response.ok,true,`${name}: ${result.body.error?.message??result.response.status}`);assert.equal(result.body.ok,true,`${name} returned ok=false`);return result.body.result;}
async function publicAction(name,input={}){const result=await request(name,input,{type:'agent',name:'Public QA'},'zingposts-session=anonymous');assert.equal(result.response.ok,true,`${name} public: ${result.body.error?.message??result.response.status}`);return result.body.result;}

const initialResponse=await fetch(`${base}/api/state`,{headers:{cookie:sessionCookie}});assert.equal(initialResponse.ok,true);const initial=await initialResponse.json();
assert.ok(initial.listings.length>=12,'seed marketplace missing');
const guestResponse=await fetch(`${base}/api/state`,{headers:{cookie:'zingposts-session=anonymous'}});assert.equal(guestResponse.ok,true);const guest=await guestResponse.json();
assert.deepEqual(new Set(guest.publicTools),new Set(['get_agent_bootstrap','authenticate_agent','start_agent_onboarding','get_onboarding_status','open_for_human_review']));
const capabilities=await action('get_site_capabilities');
assert.equal(capabilities.architecture.builtInAI,false);
assert.equal(capabilities.architecture.businessToolsRouteScoped,false);
assert.equal(capabilities.supports.navigationIndependentCapabilityActivation,true);
assert.equal(capabilities.supports.expiringAgentInviteUrls,true);
assert.equal(capabilities.supports.browserSessionAgentDelegation,true);
assert.equal(capabilities.architecture.signedOutToolSurface,'setup-only');
assert.equal(capabilities.supports.qaNamespaces,true);
assert.equal(capabilities.supports.optimisticConcurrency,true);
assert.equal(capabilities.supports.durableResumeCheckpoints,true);
assert.equal(capabilities.supports.structuredBlockers,true);
assert.equal(capabilities.supports.versionedChangeSets,true);
assert.equal(capabilities.supports.transparentOutcomePatterns,true);
assert.ok(capabilities.tools.includes('update_board'));
assert.ok(capabilities.tools.includes('set_listing_status'));
assert.ok(capabilities.tools.includes('request_qa_cleanup'));

const publicBootstrap=await publicAction('get_agent_bootstrap',{activeCapability:'marketplace'});
assert.equal(publicBootstrap.authentication.authenticated,false);
assert.equal(publicBootstrap.authentication.agentAccess,'setup-only');
assert.equal(publicBootstrap.guide.url,'/for-agents');
assert.deepEqual(new Set(publicBootstrap.setup.availableTools),new Set(guest.publicTools));
const blockedPublicSearch=await request('search_marketplace',{query:'boats'},{type:'agent',name:'Public QA'},'zingposts-session=anonymous');
assert.equal(blockedPublicSearch.response.status,401);assert.equal(blockedPublicSearch.body.error.code,'AUTHENTICATION_REQUIRED');
const bootstrap=await action('get_agent_bootstrap',{activeCapability:'marketplace'});
assert.equal(bootstrap.authentication.authenticated,true);
assert.equal(bootstrap.canonicalAgent.id,'browser_session');
assert.equal(bootstrap.canonicalAgent.name,'Browser agent via Zingposts QA runner');
assert.equal(bootstrap.canonicalAgent.access,'browser-delegated');
assert.ok(bootstrap.workspace.counts);
assert.ok(bootstrap.capabilities.groups.some(group=>group.id==='listing'));
const firstResume=await action('get_workspace_resume');
assert.equal(firstResume.acknowledgement.tool,'acknowledge_workspace_checkpoint');
const checkpoint=await action('acknowledge_workspace_checkpoint',{processedThrough:firstResume.nextCheckpointCandidate});
assert.equal(checkpoint.durable,true);

const manifest=await action('get_webmcp_manifest',{activeCapability:'marketplace'});
assert.equal(manifest.progressiveDiscovery.strategy,'persistent_core_plus_activated_capability');
assert.equal(manifest.progressiveDiscovery.activeCapability,'marketplace');
const organizedTools=manifest.groups.flatMap(group=>group.tools);
assert.equal(organizedTools.length,new Set(organizedTools).size,'manifest must list each tool once');
assert.deepEqual(new Set(organizedTools),new Set(capabilities.tools),'manifest must cover the complete catalog');
const connectionGroup=await action('get_capability_group',{capabilityId:'connection',activeCapability:'marketplace'});
assert.equal(connectionGroup.activeNow,false);
assert.ok(connectionGroup.tools.includes('create_agent_invite'));
const activated=await action('activate_capability',{capabilityId:'activity'});
assert.equal(activated.navigationChanged,false);
assert.ok(activated.registeredAfterRediscovery.includes('start_qa_run'));
const humanView=await action('open_for_human_review',{capabilityId:'listing',listingId:'lst_whaler',section:'research'});
assert.equal(humanView.toolsChanged,false);
assert.equal(humanView.path,'/listings/lst_whaler#research');

const agentGuide=await fetch(`${base}/api/agent-guide`,{cache:'no-store'});assert.equal(agentGuide.ok,true);const guide=await agentGuide.json();
assert.equal(guide.canonicalPath,'/for-agents');assert.equal(guide.architecture.registration,'persistent core plus a navigation-independent activated capability pack');
const qa=await action('start_qa_run',{label:`Smoke ${runLabel}`});
let qaCleaned=false;
try {
const qualifyingAlertListing=await action('import_listing_url',{url:`https://example.test/qa-sailboat-${runLabel}`,title:`QA 1988 Catalina sailboat ${runLabel}`,year:1988,category:'Boats',price:1850,location:'Norfolk, VA',description:'Namespaced alert-matching test artifact.',qaRunId:qa.qaRunId});
const sailboatAlert=await action('interpret_alert',{query:'Virginia sailboats under $2,000'});
assert.equal(sailboatAlert.interpretation.criteria.category,'Boats');
assert.equal(sailboatAlert.interpretation.criteria.maxPrice,2000);
assert.equal(sailboatAlert.interpretation.criteria.location,'VA');
assert.ok(sailboatAlert.interpretation.plainLanguage.includes('Location: VA'));
assert.ok(sailboatAlert.previewCount>=1,'Virginia sailboat alert should match seeded inventory');
assert.ok(sailboatAlert.matches.some(item=>item.id===qualifyingAlertListing.listingId),'alert should return the qualifying namespaced listing');
const truckSearch=await action('search_marketplace',{query:'old trucks'});
assert.ok(truckSearch.results.some(item=>/F-?100|truck|pickup/i.test(`${item.title} ${item.model??''}`)),'old-truck search should return a truck');
assert.ok(!truckSearch.results.some(item=>/BMW 2002/i.test(item.title)),'old-truck search should not return the BMW');

const board=await action('create_board',{name:`QA board ${runLabel}`,description:'Isolated smoke artifact',color:'#3d6955',qaRunId:qa.qaRunId});
const selectedIds=initial.listings.filter(item=>item.status==='published').slice(0,2).map(item=>item.id);
const added=await action('add_listings_to_board',{boardId:board.boardId,listingIds:selectedIds,expectedVersion:board.version});
assert.equal(added.count,2);
const staleBoard=await request('update_board',{boardId:board.boardId,name:'Stale overwrite',expectedVersion:board.version});
assert.equal(staleBoard.response.status,409);assert.equal(staleBoard.body.error.code,'CONFLICT');assert.equal(staleBoard.body.error.retryable,true);assert.equal(staleBoard.body.error.details.currentVersion,2);

const collaboration=await action('start_collaboration_session',{objective:'QA human-agent loop',listingIds:selectedIds,qaRunId:qa.qaRunId});
const item=await action('add_collaboration_item',{sessionId:collaboration.sessionId,kind:'question',title:'Choose a lead',body:'Which item should we research first?',listingIds:selectedIds,options:['First','Second'],requiresHumanResponse:true,expectedVersion:collaboration.version,qaRunId:qa.qaRunId});
const blockers=await action('get_work_and_blockers');
const collaborationBlocker=blockers.workItems.find(work=>work.id===item.itemId);
assert.equal(collaborationBlocker.requiresHuman,true);assert.ok(collaborationBlocker.blockedBy.includes('human_response'));assert.ok(Array.isArray(collaborationBlocker.agentCanContinueWith));
const agentDecision=await request('respond_to_collaboration_item',{itemId:item.itemId,decision:'answered'});
assert.equal(agentDecision.response.status,400);assert.equal(agentDecision.body.error.code,'HUMAN_REQUIRED');
const invalidDecision=await request('respond_to_collaboration_item',{itemId:item.itemId,decision:'qa-reviewed'},{type:'human',name:'Ignored human label'});
assert.equal(invalidDecision.response.status,400);assert.equal(invalidDecision.body.error.code,'INVALID_INPUT');
const response=await action('respond_to_collaboration_item',{itemId:item.itemId,decision:'answered',response:'Research the first item.',expectedVersion:item.version},{type:'human',name:'Ignored human label'});
assert.equal(response.agentCanContinue,true);

const proposal=await action('create_change_set',{title:`QA shortlist proposal ${runLabel}`,summary:'Review two private organization changes.',changes:[{action:'set_listing_status',input:{listingId:selectedIds[0],status:'researching'},rationale:'Needs deeper title research.'},{action:'tag_listings',input:{listingIds:selectedIds,tags:['qa-shortlist']},rationale:'Keep the candidates together.'}],sources:[{label:'QA evidence',url:'https://example.com/evidence'}],qaRunId:qa.qaRunId});
assert.equal(proposal.status,'proposed');assert.equal(proposal.preview.length,2);assert.equal(proposal.humanReviewRequired,true);
const agentApply=await request('apply_change_set',{changeSetId:proposal.changeSetId,selectedIndexes:[0],expectedVersion:proposal.version});
assert.equal(agentApply.response.status,400);assert.equal(agentApply.body.error.code,'HUMAN_REQUIRED');
const applied=await action('apply_change_set',{changeSetId:proposal.changeSetId,selectedIndexes:[0],expectedVersion:proposal.version},{type:'human',name:'Ignored human label'});
assert.equal(applied.status,'applied');assert.deepEqual(applied.selectedIndexes,[0]);assert.deepEqual(applied.omittedIndexes,[1]);
const resumed=await action('get_workspace_resume');
assert.ok(resumed.counts.activities>0);assert.ok(resumed.changes.changeSets.some(changeSet=>changeSet.id===proposal.changeSetId));

const listing=await action('create_listing_draft',{title:`QA listing ${runLabel}`,category:'Boats',price:1250,location:'Mechanicsville, VA',description:'Not actually for sale.',qaRunId:qa.qaRunId});
const outcome=await action('record_listing_outcome',{listingId:listing.listingId,outcome:'passed',finalPrice:1150,reason:'Inspection risk',notes:'QA outcome only.',qaRunId:qa.qaRunId});
assert.equal(outcome.outcome,'passed');
const patterns=await action('get_outcome_patterns',{listingId:listing.listingId});
assert.equal(patterns.sampleSize,1);assert.equal(patterns.outcomeCounts.passed,1);assert.equal(patterns.medianFinalPrice,1150);assert.ok(patterns.method.includes('no model-generated score'));
const research=await action('record_price_comparable',{listingId:listing.listingId,title:'QA comparable',soldPrice:1100,sourceUrl:'https://example.com/comparable',sourceLabel:'Example archive',notes:'Schema and cleanup test.',qaRunId:qa.qaRunId});
assert.equal(research.comparable.soldPrice,1100);
const alert=await action('create_alert_draft',{name:`QA alert ${runLabel}`,query:'Virginia sailboats under $2,000',criteria:{},qaRunId:qa.qaRunId});
assert.ok(alert.previewCount>=1);
const alertGate=await action('enable_alert',{alertId:alert.alertId,qaRunId:qa.qaRunId});
assert.equal(alertGate.confirmationRequired,true,'agent alert enable must remain human-gated');
const message=await action('draft_seller_message',{listingId:'lst_whaler',body:'QA draft only; do not send.',qaRunId:qa.qaRunId});
const messageGate=await action('request_message_send',{messageId:message.messageId,qaRunId:qa.qaRunId});
assert.equal(messageGate.confirmationRequired,true);assert.equal(messageGate.humanRequired,true);
const badConversation=await request('update_negotiation_status',{conversationId:message.conversationId,status:'qa-planning'});
assert.equal(badConversation.response.status,400);assert.equal(badConversation.body.error.code,'INVALID_TRANSITION');
const trade=await action('create_trade_room',{title:`QA trade ${runLabel}`,summary:'Private test room',qaRunId:qa.qaRunId});
const badTrade=await request('record_trade_decision',{tradeId:trade.tradeId,decision:'qa-reviewed',expectedVersion:trade.version});
assert.equal(badTrade.response.status,400);assert.equal(badTrade.body.error.code,'INVALID_TRANSITION');
const missing=await request('get_conversation',{conversationId:'con_missing'});
assert.equal(missing.response.status,404);assert.equal(missing.body.error.code,'NOT_FOUND');assert.equal(typeof missing.body.error.details,'object');

const cleanupGate=await action('request_qa_cleanup',{qaRunId:qa.qaRunId});
assert.equal(cleanupGate.confirmationRequired,true);
const preview=await action('preview_qa_cleanup',{qaRunId:qa.qaRunId});
assert.ok(preview.count>=8);assert.equal(preview.scope,'Only records registered to this QA run are eligible.');
const cleaned=await action('request_qa_cleanup',{qaRunId:qa.qaRunId,confirmed:true},{type:'human',name:'Ignored human label'});
assert.equal(cleaned.status,'cleaned');assert.equal(cleaned.removed,preview.count);
qaCleaned=true;
const afterCleanup=await action('preview_qa_cleanup',{qaRunId:qa.qaRunId});assert.equal(afterCleanup.count,0);

console.log(JSON.stringify({ok:true,seededListings:initial.listings.length,webmcpTools:capabilities.tools.length,signedOutSetupTools:guest.publicTools.length,signedOutMarketplaceBlocked:true,browserSessionDelegation:true,manifestUnique:true,bootstrap:true,durableResume:true,structuredBlockers:true,selectiveChangeSetReview:true,outcomePatterns:true,guide:true,capabilityActivationWithoutNavigation:true,alertRegression:true,searchRelevance:true,structuredErrors:true,concurrency:true,qaCleanup:true,consequentialActionsExecuted:false},null,2));
} finally {
  if(!qaCleaned) await request('request_qa_cleanup',{qaRunId:qa.qaRunId,confirmed:true},{type:'human',name:'Zingposts QA cleanup'}).catch(()=>null);
}
