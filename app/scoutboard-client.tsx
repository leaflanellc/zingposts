'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Row=Record<string,any>;
type State={authenticated:true;authMode:string;pendingSetup?:Row|null;user:Row;preferences:Row;verification:Row;listings:Row[];users:Row[];boards:Row[];boardItems:Row[];saved:Row[];alerts:Row[];research:Row[];conversations:Row[];messages:Row[];offers:Row[];trades:Row[];participants:Row[];assets:Row[];activities:Row[];confirmations:Row[];agents:Row[];collaborationSessions:Row[];collaborationItems:Row[]};
type GuestState={authenticated:false;authMode:string;pendingSetup?:Row|null;agentAuthenticated?:boolean;agentSession?:Row|null;listings:Row[];publicTools:string[];connectionGuide:Row};
type BootState=State|GuestState;
type ModalType='listing'|'track'|'board'|'alert'|'research'|'comparable'|'plan'|'message'|'offer'|'trade'|'pair'|'verify'|null;
type WebMCPRuntimeStatus={checked:boolean;supported:boolean;surfaces:string[];availableTools:number;registeredToolNames:string[];failedToolNames:string[]};

function createAgentInvitePrompt(origin:string,status:WebMCPRuntimeStatus){
  const ready=status.supported&&status.registeredToolNames.length===status.availableTools;
  const snapshot=!status.checked?'the page had not finished checking WebMCP':!status.supported?'no usable modelContext API was detected':ready?`${status.registeredToolNames.length} of ${status.availableTools} tools were registered via ${status.surfaces.join(' and ')}`:`${status.registeredToolNames.length} of ${status.availableTools} tools registered`;
  return [
    'You are my outside agent for Zingposts. Zingposts has no built-in AI; you provide the reasoning while the site provides deterministic WebMCP tools and our durable shared workspace.',
    '',
    `Open ${origin} in the browser tab you can actually control. At the moment I copied this prompt, ${snapshot}. Treat that as a snapshot only and run the preflight again in the tab you open.`,
    '',
    'Compatibility preflight — do this before claiming you are connected:',
    '1. Discover the active page’s WebMCP tools. WebMCP is page-scoped, so rediscover after sign-in, reloads, navigation, or returning later.',
    '2. Look for get_webmcp_manifest, get_auth_status, and connect_agent. Do not substitute DOM scraping or ordinary clicking for missing WebMCP access.',
    '3. If you cannot discover them, inspect the bottom-right “WebMCP tools” panel or ask me to open it:',
    '   - If it says “Browser setup needed,” tell me the browser does not expose a usable modelContext API. Give concise, current setup or update instructions for the browser we are using, then stop before changing marketplace state.',
    '   - If it says “Browser ready” but you still cannot see the tools, tell me clearly that my agent/runtime lacks WebMCP support or permission to this tab. Identify your runtime, explain the minimum update or browser-connector change it needs, and provide the exact supported configuration path from your current documentation. Do not pretend you connected.',
    '   - If you cannot inspect or control a browser tab at all, tell me that this agent needs a browser connection capable of WebMCP discovery.',
    '4. For compatible experimental Chrome setups, check WebMCP enablement, remote debugging permission, and whether this is the focused tab—but verify the exact steps against current browser and agent documentation rather than guessing.',
    '',
    'Once WebMCP discovery works:',
    '1. Call get_webmcp_manifest, get_capability_index, and get_auth_status.',
    '2. If the page is signed out, open it for me to sign in. Wait for me, then rediscover the tools because the authenticated catalog is larger.',
    '3. If authenticate_agent is available and I included a one-time code below, call it first. Codes expire in 10 minutes and work once. Never store or repeat the code after authentication.',
    '4. Call connect_agent with your name. On a verified workspace, only say you are connected after both authenticate_agent and connect_agent succeed.',
    '5. Call get_site_capabilities, get_workspace_setup_status, get_workspace_overview, and get_human_attention_queue. Use the overview and capability index to resume durable work instead of guessing identifiers or parameters.',
    '6. Use get_capability_group and navigate_to_workspace to open the relevant human-visible workspace, then rediscover the smaller contextual catalog before acting.',
    '7. Unless I gave you a more specific task, inspect the visible workspace and recent activity, start a collaboration session, and leave a short ready-to-help note with concrete next-step suggestions.',
    '',
    'Working rules:',
    '- Use Zingposts as our durable source of truth for listings, boards, alerts, research, drafts, decisions, and activity.',
    '- You may search, compare, organize, research, monitor, and prepare drafts autonomously through the available tools.',
    '- Never publish a listing, change the public presentation of a live listing, contact another person, submit or respond to an offer, or invite a trade participant unless Zingposts presents the exact action to me for verification and one-time human approval.',
    '- If you support reusable skills or scheduled work, offer to save a small Zingposts routine that reopens the site, repeats this preflight, rediscovers tools, checks alerts and attention items, and reports changes. Never assume a tab or cached tool catalog remains connected.'
  ].join('\n');
}

async function writeClipboardText(value:string){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}}catch{}
  const textarea=document.createElement('textarea');
  textarea.value=value; textarea.setAttribute('readonly',''); textarea.style.position='fixed'; textarea.style.left='-9999px'; textarea.style.opacity='0';
  document.body.appendChild(textarea); textarea.focus(); textarea.select();
  try{return document.execCommand('copy');}catch{return false;}finally{textarea.remove();}
}

const toolDefinitions=[
  ['get_site_capabilities','Describe Zingposts capabilities, safety boundaries, and available workflows.',{}],
  ['get_webmcp_manifest','Discover the complete Zingposts catalog plus its progressive, page-aware registration strategy.',{currentContext:'string'}],
  ['get_capability_index','Return a compact index of Zingposts capability areas, routes, requirements, and recommended entry tools.',{currentContext:'string'}],
  ['get_capability_group','Expand one capability area into its workflow, tool names, safety boundary, and navigation requirements.',{capabilityId:'string'}],
  ['navigate_to_workspace','Open the human-visible workspace where a capability’s typed WebMCP tools become active.',{capabilityId:'string',listingId:'string',boardId:'string',sessionId:'string',section:'string'}],
  ['get_connection_guide','Explain WebMCP reconnection, persistent agent profiles, and a safe Zingposts skill or monitoring pattern.',{}],
  ['get_auth_status','Check the signed-in human and connected agent authorization state.',{}],
  ['authenticate_agent','Exchange a user-issued, single-use code for a revocable agent session on a verified workspace.',{code:'string'}],
  ['create_agent_auth_code','Let the verified signed-in person issue a single-use, 10-minute agent authentication code.',{name:'string',scopes:'array'}],
  ['connect_agent','Connect immediately for public discovery or safe work in the signed-in workspace; publishing and outbound commerce remain verified human actions.',{name:'string'}],
  ['get_workspace_overview','Return counts, recent durable records, deep links, and the specific list tool for each workspace area.',{}],
  ['list_collaboration_sessions','List resumable shared human-agent work sessions and their existing canvas items.',{}],
  ['start_collaboration_session','Open a durable shared work session with an objective the person can watch and guide.',{agentName:'string',objective:'string',listingIds:'array',constraints:'object',idempotencyKey:'string'}],
  ['get_collaboration_session','Read a shared work session, its agent updates, and any human responses.',{sessionId:'string'}],
  ['add_collaboration_item','Place a shortlist, question, recommendation, decision, or note on the human’s shared canvas.',{sessionId:'string',kind:'string',title:'string',body:'string',listingIds:'array',options:'array',requiresHumanResponse:'boolean',idempotencyKey:'string'}],
  ['get_human_attention_queue','List collaboration questions and consequential actions currently waiting for the person.',{}],
  ['respond_to_collaboration_item','Record the signed-in person’s response so the outside agent can continue.',{itemId:'string',decision:'string',response:'string',selectedOption:'string',idempotencyKey:'string'}],
  ['update_collaboration_session','Update progress, summary, or completion state for a shared work session.',{sessionId:'string',status:'string',summary:'string',idempotencyKey:'string'}],
  ['get_verification_status','Check whether the signed-in account is verified for publishing and outbound buyer or seller actions.',{}],
  ['get_interface_preferences','Read the signed-in user’s durable navigation and listing-detail preferences.',{}],
  ['set_interface_preferences','Set durable interface preferences such as collapsed navigation and full-screen sequential listing details.',{preferences:'object'}],
  ['set_navigation_collapsed','Collapse or expand the left workspace navigation for the signed-in user.',{collapsed:'boolean'}],
  ['get_marketplace_view','Read the human’s current marketplace canvas mode, visible category, and filter-panel state.',{}],
  ['set_marketplace_view','Switch the shared marketplace canvas between gallery, focus, and thumbnails or change its visible filters.',{mode:'string',category:'string',filtersExpanded:'boolean'}],
  ['get_workspace_setup_status','Check whether agent pairing and marketplace preferences are complete.',{}],
  ['propose_workspace_preferences','Prepare reviewable marketplace, research, and communication preferences.',{categories:'array',maxPrice:'number',radiusMiles:'number',researchDepth:'string'}],
  ['start_agent_onboarding','Let an external agent prepare a scoped Zingposts setup before the person arrives.',{agentName:'string',scopes:'array',preferences:'object'}],
  ['get_onboarding_status','Check whether an agent-first setup is waiting for the user, approved, or expired.',{setupSessionId:'string'}],
  ['start_agent_pairing','Compatibility alias that immediately connects this agent for safe workspace work.',{name:'string',scopes:'array'}],
  ['revoke_agent','Revoke a connected agent without changing the human account password.',{agentId:'string'}],
  ['apply_workspace_preferences','Configure categories, budget, distance, research depth, and communication style.',{agentId:'string',preferences:'object'}],
  ['get_agent_permissions','Inspect the current scopes granted to one connected agent.',{agentId:'string'}],
  ['request_agent_permission','Request additional scopes and return the connection to human review.',{agentId:'string',scopes:'array'}],
  ['search_marketplace','Search titles, categories, descriptions, specifications, locations, and sellers with structured filters, synonyms, sorting, and pagination.',{query:'string',category:'string',minPrice:'number',maxPrice:'number',afterYear:'number',beforeYear:'number',condition:'string',location:'string',sort:'string',page:'number',pageSize:'number'}],
  ['get_listing','Retrieve the current structured Zingposts listing record.',{listingId:'string'}],
  ['get_listing_snapshot','Retrieve a timestamped listing snapshot and source-authority status.',{listingId:'string'}],
  ['find_possible_duplicates','Find records that may represent the same item.',{listingId:'string'}],
  ['compare_listings','Compare price, condition, completeness, attention, and source type.',{listingIds:'array'}],
  ['refresh_listing_status','Check the latest known availability and source authority.',{listingId:'string'}],
  ['list_my_listings','List native and tracked listings owned by the signed-in user, including unpublished drafts.',{status:'string'}],
  ['create_listing_draft','Create an unpublished native Zingposts listing for the signed-in seller.',{title:'string',year:'number',make:'string',model:'string',category:'string',price:'number',location:'string',description:'string',condition:'string'}],
  ['attach_listing_image_from_url','Import a permitted public HTTPS image into private Zingposts storage with source and alt-text metadata. Drafts update immediately; changing a live listing waits for verified human approval.',{listingId:'string',sourceUrl:'string',sourceLabel:'string',altText:'string'}],
  ['update_listing_draft','Update a listing owned by the current user.',{listingId:'string',title:'string',price:'number',description:'string'}],
  ['request_listing_publish','Request human confirmation before publishing a native listing.',{listingId:'string'}],
  ['update_listing_price','Update the price of a listing owned by the current user.',{listingId:'string',price:'number'}],
  ['set_listing_availability','Mark an owned listing available, pending, sold, or withdrawn.',{listingId:'string',status:'string'}],
  ['archive_listing','Archive an owned Zingposts listing.',{listingId:'string'}],
  ['import_listing_url','Track an outside marketplace listing alongside Zingposts listings.',{url:'string',title:'string',price:'number',location:'string',category:'string'}],
  ['list_saved_items','List the signed-in user’s saved listings and private workspace statuses.',{}],
  ['save_listing','Save a listing to the user workspace.',{listingId:'string',status:'string'}],
  ['unsave_listing','Remove a listing from saved items.',{listingId:'string'}],
  ['list_boards','List boards, their identifiers, ranked memberships, notes, colors, and listing summaries.',{}],
  ['create_board','Create a flexible board for organizing listings.',{name:'string',description:'string',color:'string'}],
  ['update_board','Update the name, description, or color of a board.',{boardId:'string',name:'string',description:'string',color:'string'}],
  ['add_listings_to_board','Add one or more listings to a board in a specified order.',{boardId:'string',listingIds:'array',notes:'string'}],
  ['remove_listings_from_board','Remove one or more listings from a board.',{boardId:'string',listingIds:'array'}],
  ['rank_board_items','Apply an explicit listing order to a board.',{boardId:'string',listingIds:'array'}],
  ['set_listing_status','Set a private workspace status such as watching or inspecting.',{listingId:'string',status:'string'}],
  ['tag_listings','Add flexible private tags to one or more listings.',{listingIds:'array',tags:'array'}],
  ['interpret_alert','Interpret natural-language alert intent into visible criteria and preview matching listings.',{query:'string',criteria:'object'}],
  ['list_alerts','List existing alert drafts and active or paused monitoring rules.',{}],
  ['create_alert_draft','Turn reviewed marketplace intent into an alert draft with its interpretation and current matches.',{name:'string',query:'string',criteria:'object',idempotencyKey:'string'}],
  ['preview_alert_matches','Preview current matches before an alert is enabled.',{alertId:'string'}],
  ['enable_alert','Request human confirmation before enabling alert notifications.',{alertId:'string'}],
  ['pause_alert','Pause an active marketplace alert.',{alertId:'string'}],
  ['get_listing_research','Read the durable research notebook for one listing, including cited sources and confidence.',{listingId:'string'}],
  ['get_price_research','Read the listing ask, structured sold comparables, market range, and latest private offer plan.',{listingId:'string'}],
  ['analyze_price_and_offer','Calculate a transparent target, ceiling, and all-in range from recorded comparables and explicit cost assumptions.',{listingId:'string',repairs:'number',transport:'number',tax:'number',contingency:'number',targetDiscountPercent:'number',maximumAllInBudget:'number'}],
  ['add_research_note','Add a cited research note to a listing.',{listingId:'string',title:'string',body:'string',sources:'array',confidence:'string'}],
  ['create_research_task','Create a durable research question tied to a listing.',{listingId:'string',title:'string',body:'string'}],
  ['attach_research_source','Attach an attributed source to a listing notebook.',{listingId:'string',label:'string',url:'string',notes:'string'}],
  ['record_comparable_sale','Record a comparable sale with notes and source links.',{listingId:'string',title:'string',body:'string',sources:'array'}],
  ['record_price_comparable','Record a structured sold comparable with price, date, condition, location, and source.',{listingId:'string',title:'string',soldPrice:'number',soldDate:'string',location:'string',condition:'string',sourceUrl:'string',sourceLabel:'string',notes:'string',confidence:'string'}],
  ['record_unknown_or_risk','Record a material unknown, risk, or claim needing verification.',{listingId:'string',title:'string',body:'string'}],
  ['create_inspection_checklist','Create a listing-specific inspection checklist.',{listingId:'string',title:'string',items:'array'}],
  ['schedule_follow_up','Record the next seller or inspection follow-up.',{listingId:'string',title:'string',notes:'string'}],
  ['list_listing_changes','List attributable listing and workspace changes.',{listingId:'string'}],
  ['record_price_change','Record a price change and make it undoable.',{listingId:'string',price:'number'}],
  ['calculate_total_acquisition_cost','Calculate purchase, transport, tax, and repair cost for a listing.',{listingId:'string',transport:'number',tax:'number',repairs:'number'}],
  ['list_conversations','List the signed-in user’s conversations with their listing context, messages, offers, and deep links.',{}],
  ['draft_seller_message','Create a buyer message draft without sending it.',{listingId:'string',body:'string'}],
  ['draft_seller_response','Create a seller response draft without sending it.',{listingId:'string',body:'string'}],
  ['request_message_send','Request human confirmation before sending a drafted message.',{messageId:'string'}],
  ['list_listing_conversations','List buyer and seller conversations for a listing.',{listingId:'string'}],
  ['get_conversation','Retrieve a conversation with messages and offers.',{conversationId:'string'}],
  ['summarize_conversation','Summarize a negotiation without changing it.',{conversationId:'string'}],
  ['summarize_buyer_interest','Summarize interest across listings owned by the seller.',{}],
  ['create_negotiation_plan','Create a private target, ceiling, strategy, and contingency plan.',{listingId:'string',targetOffer:'number',ceiling:'number',strategy:'string',contingencies:'array'}],
  ['update_negotiation_status','Update a conversation workflow status.',{conversationId:'string',status:'string'}],
  ['create_offer_draft','Create an offer draft with amount, terms, and contingencies.',{listingId:'string',conversationId:'string',amount:'number',terms:'string'}],
  ['request_offer_submit','Request human confirmation before submitting an offer.',{offerId:'string'}],
  ['respond_to_offer','Request seller confirmation before accepting, countering, or declining an offer.',{offerId:'string',response:'string'}],
  ['list_trade_rooms','List resumable trade rooms with participants, assets, constraints, and deep links.',{}],
  ['create_trade_room','Create a structured multi-party trade room with participants and assets.',{title:'string',summary:'string',participants:'array',assets:'array'}],
  ['add_trade_participant','Add a named participant and role to a trade room.',{tradeId:'string',name:'string',email:'string',role:'string'}],
  ['add_trade_asset','Add a listing or other valued asset to a trade room.',{tradeId:'string',listingId:'string',ownerName:'string',label:'string',value:'number',cashAdjustment:'number',conditions:'array'}],
  ['set_trade_constraint','Add an inspection, ownership, timing, or transport constraint.',{tradeId:'string',constraint:'string'}],
  ['propose_trade_scenario','Build a reviewable asset and cash-adjustment trade scenario.',{tradeId:'string',name:'string',cashAdjustment:'number',conditions:'array'}],
  ['evaluate_trade_scenarios','Evaluate a trade room for value, conditions, and unresolved risks.',{tradeId:'string'}],
  ['request_trade_invitation','Request human confirmation before inviting another party.',{tradeId:'string',participantId:'string'}],
  ['record_trade_decision','Record the human decision and new trade-room status.',{tradeId:'string',decision:'string'}],
  ['list_recent_agent_actions','List inspectable human and agent activity.',{limit:'number'}],
  ['undo_agent_action','Undo a reversible agent action by activity id.',{activityId:'string'}],
] as const;

const publicToolNames=new Set(['get_site_capabilities','get_webmcp_manifest','get_capability_index','get_capability_group','navigate_to_workspace','get_connection_guide','get_auth_status','authenticate_agent','connect_agent','start_agent_onboarding','get_onboarding_status','search_marketplace','interpret_alert','get_listing','get_listing_snapshot']);
const WEBMCP_PAGE_GROUPS=[
  {id:'marketplace',label:'Marketplace canvas',copy:'Search, compare, resume saved work, and organize the finds visible on the main canvas.',tools:['get_workspace_overview','search_marketplace','get_marketplace_view','set_marketplace_view','compare_listings','list_saved_items','save_listing','unsave_listing','list_boards','create_board','add_listings_to_board','remove_listings_from_board','rank_board_items','tag_listings']},
  {id:'listing',label:'Listing details',copy:'Inspect one item deeply, build cited price evidence, calculate a defensible range, and prepare next steps.',tools:['get_listing','get_listing_snapshot','find_possible_duplicates','refresh_listing_status','get_listing_research','get_price_research','analyze_price_and_offer','list_listing_changes','add_research_note','create_research_task','attach_research_source','record_comparable_sale','record_price_comparable','record_unknown_or_risk','create_inspection_checklist','schedule_follow_up','calculate_total_acquisition_cost','draft_seller_message','create_negotiation_plan']},
  {id:'selling',label:'My listings',copy:'Resume, illustrate, and maintain native listings while keeping publication behind human approval.',tools:['list_my_listings','create_listing_draft','attach_listing_image_from_url','update_listing_draft','request_listing_publish','update_listing_price','set_listing_availability','archive_listing','summarize_buyer_interest']},
  {id:'workbench',label:'Shared with agent',copy:'Resume sessions and exchange shortlists, questions, recommendations, responses, and progress updates.',tools:['list_collaboration_sessions','start_collaboration_session','get_collaboration_session','add_collaboration_item','get_human_attention_queue','respond_to_collaboration_item','update_collaboration_session']},
  {id:'alerts',label:'Alerts',copy:'Review existing monitoring, interpret new requests, preview matches, and manage alert state.',tools:['list_alerts','interpret_alert','create_alert_draft','preview_alert_matches','enable_alert','pause_alert']},
  {id:'inbox',label:'Messages & offers',copy:'Resume conversations and prepare drafts, negotiations, and offers without silently sending them.',tools:['list_conversations','draft_seller_message','draft_seller_response','request_message_send','list_listing_conversations','get_conversation','summarize_conversation','create_negotiation_plan','update_negotiation_status','create_offer_draft','request_offer_submit','respond_to_offer']},
  {id:'trades',label:'Trade rooms',copy:'Resume rooms and structure participants, assets, constraints, scenarios, invitations, and decisions.',tools:['list_trade_rooms','create_trade_room','add_trade_participant','add_trade_asset','set_trade_constraint','propose_trade_scenario','evaluate_trade_scenarios','request_trade_invitation','record_trade_decision']},
  {id:'activity',label:'Activity & undo',copy:'Inspect attributable work and reverse actions that are marked as reversible.',tools:['list_recent_agent_actions','undo_agent_action']},
  {id:'connection',label:'Connection & preferences',copy:'Discover capabilities, authenticate and connect an outside agent, and coordinate durable interface preferences.',tools:['get_site_capabilities','get_webmcp_manifest','get_connection_guide','get_auth_status','authenticate_agent','create_agent_auth_code','connect_agent','get_verification_status','get_interface_preferences','set_interface_preferences','set_navigation_collapsed','get_workspace_setup_status','propose_workspace_preferences','start_agent_onboarding','get_onboarding_status','start_agent_pairing','revoke_agent','apply_workspace_preferences','get_agent_permissions','request_agent_permission']},
] as const;
const GLOBAL_WEBMCP_TOOLS=['get_site_capabilities','get_webmcp_manifest','get_capability_index','get_capability_group','navigate_to_workspace','get_connection_guide','get_auth_status','authenticate_agent','connect_agent','get_workspace_overview','get_human_attention_queue','get_verification_status','get_workspace_setup_status'] as const;
function webmcpContextId(view:string,detailOpen:boolean){return detailOpen?'listing':view==='mine'?'selling':view==='workbench'?'workbench':view==='alerts'?'alerts':view==='inbox'?'inbox':view==='trades'?'trades':view==='activity'?'activity':view==='agent'?'connection':'marketplace'}
function contextualToolNames(contextId:string){const group=WEBMCP_PAGE_GROUPS.find(item=>item.id===contextId)??WEBMCP_PAGE_GROUPS[0];return new Set<string>([...GLOBAL_WEBMCP_TOOLS,...group.tools])}
let webmcpRegistrationQueue:Promise<void>=Promise.resolve();
function enqueueWebMCPRegistration(task:()=>Promise<void>){const next=webmcpRegistrationQueue.catch(()=>{}).then(task);webmcpRegistrationQueue=next.catch(()=>{});return next}
let webmcpRegisteredToolNames=new Set<string>();
let currentWebMCPCall:((name:string,input?:Row)=>Promise<unknown>)|null=null;
const MARKETPLACE_CATEGORIES=['All','Cars & trucks','Boats','Campers','Machinery','Motorcycles'];
const CLIENT_SEARCH_SYNONYMS:Record<string,string[]>={boat:['boat','boats','watercraft'],boats:['boat','boats','watercraft'],truck:['truck','trucks','pickup','4x4','4×4'],trucks:['truck','trucks','pickup','4x4','4×4'],watercraft:['boat','boats','watercraft'],'4x4':['4x4','4×4','four wheel drive'],camper:['camper','campers','rv','airstream']};

function routeState(pathname:string){
  const parts=pathname.split('/').filter(Boolean); const section=parts[0]??''; const id=parts[1]??'';
  if(section==='listings'&&id)return {view:'browse',listingId:id,detail:true,sessionId:''};
  if(section==='boards'&&id)return {view:`board:${id}`,listingId:'',detail:false,sessionId:''};
  if(section==='alerts')return {view:'alerts',listingId:'',detail:false,sessionId:''};
  if(section==='trade-rooms')return {view:'trades',listingId:'',detail:false,sessionId:''};
  if(section==='messages')return {view:'inbox',listingId:'',detail:false,sessionId:''};
  if(section==='workbench')return {view:'workbench',listingId:'',detail:false,sessionId:id};
  if(section==='activity')return {view:'activity',listingId:'',detail:false,sessionId:''};
  if(section==='agents')return {view:'agent',listingId:'',detail:false,sessionId:''};
  return {view:'browse',listingId:'',detail:false,sessionId:''};
}

function pathForView(view:string){
  if(view.startsWith('board:'))return `/boards/${view.slice(6)}`;
  return ({browse:'/',alerts:'/alerts',trades:'/trade-rooms',inbox:'/messages',workbench:'/workbench',activity:'/activity',agent:'/agents',saved:'/?view=saved',mine:'/?view=mine'} as Record<string,string>)[view]??'/';
}

const REQUIRED_TOOL_FIELDS:Record<string,string[]>={
  get_capability_group:['capabilityId'],navigate_to_workspace:['capabilityId'],authenticate_agent:['code'],create_agent_auth_code:['name'],connect_agent:['name'],start_collaboration_session:['agentName','objective'],get_collaboration_session:['sessionId'],add_collaboration_item:['sessionId','kind','title'],respond_to_collaboration_item:['itemId','decision'],update_collaboration_session:['sessionId','status'],get_onboarding_status:['setupSessionId'],get_listing:['listingId'],get_listing_snapshot:['listingId'],find_possible_duplicates:['listingId'],compare_listings:['listingIds'],refresh_listing_status:['listingId'],create_listing_draft:['title','category','price','location','description'],attach_listing_image_from_url:['listingId','sourceUrl','altText'],update_listing_draft:['listingId'],request_listing_publish:['listingId'],update_listing_price:['listingId','price'],set_listing_availability:['listingId','status'],archive_listing:['listingId'],import_listing_url:['url','title'],save_listing:['listingId'],unsave_listing:['listingId'],create_board:['name'],update_board:['boardId'],add_listings_to_board:['boardId','listingIds'],remove_listings_from_board:['boardId','listingIds'],rank_board_items:['boardId','listingIds'],set_listing_status:['listingId','status'],tag_listings:['listingIds','tags'],interpret_alert:['query'],create_alert_draft:['name','query'],preview_alert_matches:['alertId'],enable_alert:['alertId'],pause_alert:['alertId'],get_listing_research:['listingId'],get_price_research:['listingId'],analyze_price_and_offer:['listingId'],add_research_note:['listingId','title','body'],create_research_task:['listingId','title'],attach_research_source:['listingId','url'],record_comparable_sale:['listingId','title'],record_price_comparable:['listingId','title','soldPrice'],record_unknown_or_risk:['listingId','title'],create_inspection_checklist:['listingId','items'],schedule_follow_up:['listingId','title'],list_listing_changes:['listingId'],record_price_change:['listingId','price'],calculate_total_acquisition_cost:['listingId'],draft_seller_message:['listingId','body'],draft_seller_response:['listingId','body'],request_message_send:['messageId'],list_listing_conversations:['listingId'],get_conversation:['conversationId'],summarize_conversation:['conversationId'],create_negotiation_plan:['listingId','targetOffer','ceiling'],update_negotiation_status:['conversationId','status'],create_offer_draft:['listingId','amount'],request_offer_submit:['offerId'],respond_to_offer:['offerId','response'],create_trade_room:['title'],add_trade_participant:['tradeId','name'],add_trade_asset:['tradeId','label'],set_trade_constraint:['tradeId','constraint'],propose_trade_scenario:['tradeId','name'],evaluate_trade_scenarios:['tradeId'],request_trade_invitation:['tradeId','participantId'],record_trade_decision:['tradeId','decision'],undo_agent_action:['activityId']
};
const FIELD_DESCRIPTIONS:Record<string,string>={capabilityId:'Capability identifier returned by get_capability_index.',currentContext:'Current page capability identifier; outside agents may omit it because Zingposts supplies it.',code:'Single-use agent authentication code supplied directly by the user; never retain it after exchange.',section:'Optional subview, such as research for a listing.',listingId:'Stable Zingposts listing identifier.',listingIds:'Stable Zingposts listing identifiers.',boardId:'Stable board identifier returned by list_boards or create_board.',alertId:'Stable alert identifier returned by list_alerts or create_alert_draft.',sessionId:'Stable collaboration session identifier.',conversationId:'Stable conversation identifier returned by list_conversations.',tradeId:'Stable trade-room identifier returned by list_trade_rooms.',sourceUrl:'Public HTTPS URL for an image the user is permitted to use.',sourceLabel:'Human-readable attribution for the image source.',altText:'Concise accessible description of the image.',idempotencyKey:'Caller-provided key for safe mutation retries.'};
function schemaFrom(toolName:string,fields:Record<string,string>){ const properties:Record<string,unknown>={}; for(const [name,type] of Object.entries(fields)){ const description=FIELD_DESCRIPTIONS[name]; properties[name]=type==='array'?{type:'array',items:{},...(description?{description}:{})}:type==='object'?{type:'object',additionalProperties:true,...(description?{description}:{})}:{type,...(description?{description}:{})}; } return {type:'object',properties,required:REQUIRED_TOOL_FIELDS[toolName]??[],additionalProperties:false}; }

const READ_ONLY_TOOLS=new Set(['get_site_capabilities','get_webmcp_manifest','get_capability_index','get_capability_group','get_connection_guide','get_auth_status','get_verification_status','get_interface_preferences','get_marketplace_view','get_workspace_setup_status','get_workspace_overview','get_onboarding_status','get_agent_permissions','get_listing','get_listing_snapshot','list_my_listings','list_saved_items','list_boards','list_alerts','get_listing_research','get_price_research','analyze_price_and_offer','list_conversations','list_trade_rooms','list_collaboration_sessions','get_conversation','get_collaboration_session','get_human_attention_queue','search_marketplace','interpret_alert','preview_alert_matches','find_possible_duplicates','compare_listings','refresh_listing_status','list_listing_changes','calculate_total_acquisition_cost','list_listing_conversations','summarize_conversation','summarize_buyer_interest','evaluate_trade_scenarios','list_recent_agent_actions']);
const UNTRUSTED_OUTPUT_TOOLS=new Set(['get_workspace_overview','search_marketplace','get_listing','get_listing_snapshot','list_my_listings','list_saved_items','list_boards','list_alerts','get_listing_research','get_price_research','analyze_price_and_offer','list_conversations','get_conversation','summarize_conversation','list_trade_rooms','list_collaboration_sessions','get_collaboration_session','get_human_attention_queue','list_listing_conversations','summarize_buyer_interest','list_recent_agent_actions']);
const CONSEQUENTIAL_TOOLS=new Set(['request_listing_publish','attach_listing_image_from_url','request_message_send','request_offer_submit','respond_to_offer','request_trade_invitation']);
const DESTRUCTIVE_TOOLS=new Set(['revoke_agent','archive_listing','unsave_listing','remove_listings_from_board','pause_alert']);
const actionInput=(action:string,input:Row)=>READ_ONLY_TOOLS.has(action)||input.idempotencyKey?input:{...input,idempotencyKey:crypto.randomUUID()};

async function postAction(action:string,input:Row={},actor:Row={type:'human'}){ const response=await fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,input:actionInput(action,input),actor})}); const body=await response.json() as {ok:boolean;result:any;error?:string|{code?:string;message?:string}}; if(!response.ok||!body.ok){const message=typeof body.error==='string'?body.error:body.error?.message;const error=new Error(message??'Zingposts action failed');(error as any).code=typeof body.error==='object'?body.error?.code:'ACTION_FAILED';throw error;} return body.result; }

export default function ZingpostsClient(){
  const [state,setState]=useState<BootState|null>(null); const [view,setView]=useState('browse'); const [query,setQuery]=useState(''); const [category,setCategory]=useState('All'); const [viewMode,setViewMode]=useState('gallery'); const [filtersExpanded,setFiltersExpanded]=useState(false); const [draggingId,setDraggingId]=useState<string|null>(null); const [selectedId,setSelectedId]=useState('lst_whaler'); const [selectedSessionId,setSelectedSessionId]=useState(''); const [detailOpen,setDetailOpen]=useState(false); const [modal,setModal]=useState<ModalType>(null); const [toast,setToast]=useState(''); const [busy,setBusy]=useState(false); const [detailTab,setDetailTab]=useState('overview'); const [accountOpen,setAccountOpen]=useState(false); const [reviewConfirmation,setReviewConfirmation]=useState<Row|null>(null); const [agentPulse,setAgentPulse]=useState<Row|null>(null);
  const [webmcpStatus,setWebmcpStatus]=useState<WebMCPRuntimeStatus>({checked:false,supported:false,surfaces:[],availableTools:0,registeredToolNames:[],failedToolNames:[]});
  const autoClaimedSetup=useRef<string|null>(null);
  const authenticated=state?.authenticated;
  const agentAuthenticated=Boolean(state&&!state.authenticated&&state.agentAuthenticated);
  const authenticatedPreferences=state?.authenticated?state.preferences:null;
  const load=useCallback(async()=>{ const setup=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('setup'):null; const response=await fetch(`/api/state${setup?`?setup=${encodeURIComponent(setup)}`:''}`,{cache:'no-store'}); const body=await response.json() as BootState & {error?:string}; if(!response.ok) throw new Error(body.error??'Unable to load Zingposts'); setState(body); },[]);
  useEffect(()=>{ load().catch(error=>setToast(error.message)); },[load]);
  useEffect(()=>{const applyRoute=()=>{const route=routeState(window.location.pathname);setView(route.view);if(route.listingId)setSelectedId(route.listingId);if(route.detail&&window.location.hash==='#research')setDetailTab('research');setDetailOpen(route.detail);setSelectedSessionId(route.sessionId)};applyRoute();window.addEventListener('popstate',applyRoute);return()=>window.removeEventListener('popstate',applyRoute)},[]);
  const act=useCallback(async(action:string,input:Row={},message?:string,actor:Row={type:'human'})=>{ setBusy(true); setToast(`Working on ${action.replaceAll('_',' ')}…`); try{ const result=await postAction(action,input,actor); await load(); setToast(message??(result.confirmationRequired?'Waiting for your confirmation.':'Done.')); return result; }catch(error){ setToast(error instanceof Error?error.message:'Action failed'); throw error; }finally{ setBusy(false); } },[load]);

  useEffect(()=>{ const setup=state?.authenticated?state.pendingSetup:null; if(!setup?.found||!['awaiting_user','awaiting_approval'].includes(setup.status)||autoClaimedSetup.current===setup.id)return; autoClaimedSetup.current=setup.id; postAction('approve_agent_onboarding',{setupSessionId:setup.id},{type:'system',name:'Zingposts'}).then(result=>{window.history.replaceState({},'',window.location.pathname);setToast(result.agentAuthenticationRequired?`${setup.agent_name} is ready. Use Bring my agent to issue its private-workspace code.`:`${setup.agent_name} connected for prototype workspace work.`);return load();}).catch(error=>{autoClaimedSetup.current=null;setToast(error instanceof Error?error.message:'Unable to attach agent setup.');}); },[state,load]);

  useEffect(()=>{
    if(authenticated===undefined) return; let cancelled=false; const contextId=webmcpContextId(view,detailOpen); const activeNames=authenticated||agentAuthenticated?contextualToolNames(contextId):publicToolNames; const available=toolDefinitions.filter(([name])=>activeNames.has(name));
    const call=async(name:string,input:Row={})=>{ setAgentPulse({name,status:'working',startedAt:Date.now()}); const effectiveInput=['get_webmcp_manifest','get_capability_index'].includes(name)?{...input,currentContext:contextId}:input; const result=await postAction(name,effectiveInput,{type:'agent',name:'Connected WebMCP agent'}); if(name==='navigate_to_workspace'&&result?.path){setTimeout(()=>{setView(String(result.view??'browse'));setSelectedSessionId(String(result.sessionId??''));if(result.listingId)setSelectedId(String(result.listingId));setDetailTab(result.hash==='#research'?'research':'overview');setDetailOpen(Boolean(result.detailOpen));setModal(null);window.history.pushState({},'',String(result.path));},0);}else await load(); setAgentPulse({name,status:'complete',startedAt:Date.now()}); setTimeout(()=>setAgentPulse(null),2800); window.dispatchEvent(new CustomEvent('zingposts:tool-result',{detail:{name,input:effectiveInput,result}})); return result; };
    currentWebMCPCall=call;
    (window as any).__zingpostsWebMCP={listTools:()=>available.map(([name,description])=>({name,description})),callTool:call};
    const candidates=[{name:'navigator.modelContext',context:(navigator as any).modelContext},{name:'document.modelContext',context:(document as any).modelContext}].filter(item=>Boolean(item.context));
    const contexts=candidates.filter((item,index)=>candidates.findIndex(candidate=>candidate.context===item.context)===index);
    const supportedContexts=contexts.filter(item=>typeof item.context.registerTool==='function');
    const previouslyRegistered=[...webmcpRegisteredToolNames].filter(name=>activeNames.has(name));
    setWebmcpStatus({checked:true,supported:supportedContexts.length>0,surfaces:contexts.map(item=>item.name),availableTools:available.length,registeredToolNames:previouslyRegistered,failedToolNames:[]});
    const register=async()=>{
      if(cancelled)return; const registered=new Set(webmcpRegisteredToolNames); const failed=new Set<string>();
      for(const name of [...registered]){
        if(activeNames.has(name))continue;
        for(const {context} of supportedContexts)try{await Promise.resolve(context.unregisterTool?.(name));}catch{}
        registered.delete(name);
      }
      for(const [name,description,fields] of available){
        if(cancelled) break;
        if(registered.has(name))continue;
        let toolRegistered=false;
        for(const {context} of supportedContexts){
          try{
            await Promise.resolve(context.unregisterTool?.(name));
            await Promise.resolve(context.registerTool({name,description,inputSchema:schemaFrom(name,fields as Record<string,string>),annotations:{readOnlyHint:READ_ONLY_TOOLS.has(name),untrustedContentHint:UNTRUSTED_OUTPUT_TOOLS.has(name),destructiveHint:DESTRUCTIVE_TOOLS.has(name)},execute:(input:Row)=>currentWebMCPCall?.(name,input)}));
            if(cancelled){await Promise.resolve(context.unregisterTool?.(name));break;}
            toolRegistered=true;
          }catch(error){console.warn(`WebMCP tool ${name} could not register`,error);}
        }
        if(toolRegistered)registered.add(name);else if(supportedContexts.length)failed.add(name);
      }
      webmcpRegisteredToolNames=registered;
      if(!cancelled)setWebmcpStatus({checked:true,supported:supportedContexts.length>0,surfaces:contexts.map(item=>item.name),availableTools:available.length,registeredToolNames:[...registered].filter(name=>activeNames.has(name)),failedToolNames:[...failed]});
    };
    void enqueueWebMCPRegistration(register);
    return()=>{cancelled=true};
  },[authenticated,agentAuthenticated,load,view,detailOpen]);

  useEffect(()=>{ if(!toast) return; const timer=setTimeout(()=>setToast(''),3200); return()=>clearTimeout(timer); },[toast]);
  useEffect(()=>{if(!authenticatedPreferences)return;setViewMode(String(authenticatedPreferences.browseView??'gallery'));setFiltersExpanded(Boolean(authenticatedPreferences.filtersExpanded));setCategory(String(authenticatedPreferences.browseCategory??'All'));},[authenticatedPreferences]);
  const appState=state?.authenticated?state:null; const selected=appState?.listings.find(item=>item.id===selectedId)??appState?.listings[0]; const savedIds=useMemo(()=>new Set(appState?.saved.map(item=>item.listing_id)??[]),[appState?.saved]); const userMap=Object.fromEntries((appState?.users??[]).map(user=>[user.id,user]));
  const filtered=useMemo(()=>{ if(!appState) return []; const tokens=query.toLowerCase().replace(/[^a-z0-9×]+/g,' ').split(/\s+/).filter(Boolean); let items=appState.listings.filter(item=>item.status==='published'||item.status==='tracked'); if(view==='mine') items=appState.listings.filter(item=>item.owner_id===appState.user.userId); if(view==='saved') items=items.filter(item=>savedIds.has(item.id)); if(view.startsWith('board:')){ const boardId=view.split(':')[1]; const ids=new Set(appState.boardItems.filter(item=>item.board_id===boardId).map(item=>item.listing_id)); items=items.filter(item=>ids.has(item.id)); } return items.filter(item=>{const seller=userMap[item.owner_id]?.name??'';const haystack=`${item.title} ${item.category} ${item.description} ${item.location} ${item.condition} ${item.make??''} ${item.model??''} ${seller} ${JSON.stringify(item.attributes)}`.toLowerCase();return (category==='All'||item.category===category)&&tokens.every(token=>(CLIENT_SEARCH_SYNONYMS[token]??[token]).some(term=>haystack.includes(term)))}); },[appState,view,category,query,savedIds,userMap]);
  const moveDetail=useCallback((direction:number)=>{if(!filtered.length)return;const index=Math.max(0,filtered.findIndex(item=>item.id===selectedId));const next=(index+direction+filtered.length)%filtered.length;setSelectedId(filtered[next].id);setDetailTab('overview');},[filtered,selectedId]);
  useEffect(()=>{if(!detailOpen)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setDetailOpen(false);if(event.key==='ArrowRight')moveDetail(1);if(event.key==='ArrowLeft')moveDetail(-1)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[detailOpen,moveDetail]);
  if(!state) return <main className="loading-screen"><span className="brand-mark">Z</span><p>Preparing your marketplace…</p></main>;
  if(!state.authenticated) return <GuestWelcome state={state} load={load} setToast={setToast} toast={toast} webmcpStatus={webmcpStatus}/>;

  const nav=(next:string,sessionId='')=>{setView(next);setSelectedSessionId(sessionId);setModal(null);setDetailOpen(false);window.history.pushState({},'',sessionId?`/workbench/${sessionId}`:pathForView(next))}; const sidebarCollapsed=Boolean(state.preferences?.sidebarCollapsed);
  const openDetail=(id:string)=>{setSelectedId(id);setDetailTab('overview');setDetailOpen(true);window.history.pushState({},'',`/listings/${id}`)};
  const toggleSidebar=()=>act('set_navigation_collapsed',{collapsed:!sidebarCollapsed},sidebarCollapsed?'Navigation expanded.':'Navigation collapsed.');
  const signOut=async()=>{const response=await fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'logout',returnTo:'/'})});const body=await response.json() as {redirect?:string};if(body.redirect){window.location.href=body.redirect;return;}setAccountOpen(false);await load();};
  const updateMarketplaceView=(next:Row)=>{if(next.mode)setViewMode(next.mode);if(typeof next.filtersExpanded==='boolean')setFiltersExpanded(next.filtersExpanded);if(next.category)setCategory(next.category);act('set_marketplace_view',next,'Canvas updated.');};
  const dropOnBoard=(boardId:string,listingId:string)=>{setDraggingId(null);act('add_listings_to_board',{boardId,listingIds:[listingId],notes:'Added from marketplace canvas.'},'Added to board.');};
  const pendingConfirmation=state.confirmations.find(c=>c.status==='pending'); const verificationActions=['request_listing_publish','attach_listing_image_from_url','request_message_send','request_offer_submit','respond_to_offer','request_trade_invitation']; const needsVerification=Boolean(pendingConfirmation&&verificationActions.includes(pendingConfirmation.action)&&state.verification.status!=='verified');
  return <main className="app-shell">
    {state.pendingSetup?.found&&['awaiting_user','awaiting_approval'].includes(state.pendingSetup.status)&&<PendingAgentSetup setup={state.pendingSetup} dismiss={()=>{window.history.replaceState({},'',window.location.pathname);load();}}/>}
    <div className={`workspace ${sidebarCollapsed?'nav-collapsed':''} ${draggingId?'drag-active':''}`}>
      <WorkspaceSidebar state={state} webmcpStatus={webmcpStatus} view={view} query={query} setQuery={setQuery} category={category} viewMode={viewMode} filtersExpanded={filtersExpanded} draggingId={draggingId} collapsed={sidebarCollapsed} accountOpen={accountOpen} setAccountOpen={setAccountOpen} nav={nav} toggle={toggleSidebar} setModal={setModal} signOut={signOut} setMarketplaceView={next=>{if(!(['browse','mine','saved'].includes(view)||view.startsWith('board:')))nav('browse');updateMarketplaceView(next)}} onDrop={dropOnBoard}/>
      <section className="marketplace">{['browse','mine','saved'].includes(view)||view.startsWith('board:')?<MarketplaceView view={view} items={filtered} viewMode={viewMode} selectedId={selectedId} setSelectedId={setSelectedId} openDetail={openDetail} savedIds={savedIds} state={state} act={act} draggingId={draggingId} setDraggingId={setDraggingId} dropOnBoard={dropOnBoard}/>:view==='alerts'?<AlertsView state={state} act={act} setModal={setModal}/>:view==='inbox'?<InboxView state={state} userMap={userMap} act={act}/>:view==='trades'?<TradesView state={state} setModal={setModal}/>:view==='activity'?<ActivityView state={state} act={act}/>:view==='workbench'?<WorkbenchView state={state} selectedSessionId={selectedSessionId} selectSession={id=>nav('workbench',id)} act={act} review={setReviewConfirmation}/>:<AgentView state={state} act={act} setModal={setModal}/>}</section>
    </div>
    {agentPulse&&<AgentPulse pulse={agentPulse}/>} {detailOpen&&selected&&<ListingDetail listing={selected} items={filtered} state={state} userMap={userMap} saved={savedIds.has(selected.id)} tab={detailTab} setTab={setDetailTab} act={act} setModal={setModal} close={()=>{setDetailOpen(false);window.history.pushState({},'',pathForView(view))}} move={moveDetail}/>}
    {pendingConfirmation&&(needsVerification?<VerificationDock confirmation={pendingConfirmation} dismiss={()=>act('dismiss_confirmation',{confirmationId:pendingConfirmation.id},'Request dismissed.')} verify={()=>setModal('verify')}/>:<ConfirmationDock confirmation={pendingConfirmation} review={()=>setReviewConfirmation(pendingConfirmation)} dismiss={()=>act('dismiss_confirmation',{confirmationId:pendingConfirmation.id},'Request dismissed.')}/>)} {reviewConfirmation&&<ApprovalReview confirmation={reviewConfirmation} state={state} act={act} close={()=>setReviewConfirmation(null)}/>} {modal==='verify'?<AccountVerificationModal state={state} close={()=>setModal(null)}/>:modal&&<Modal type={modal} close={()=>setModal(null)} state={state} listing={selected} act={act} onDone={()=>setModal(null)}/>}<WebMCPToolGuide view={view} detailOpen={detailOpen} authenticated status={webmcpStatus}/>{toast&&<div role="status" className="toast">{busy?'Working… ':''}{toast}</div>}
  </main>;
}

function WebMCPToolGuide({view,detailOpen,authenticated,status}:{view:string;detailOpen:boolean;authenticated:boolean;status:WebMCPRuntimeStatus}){
  const [open,setOpen]=useState(false); const contextId=webmcpContextId(view,detailOpen); const current=WEBMCP_PAGE_GROUPS.find(group=>group.id===contextId)??WEBMCP_PAGE_GROUPS[0]; const others=WEBMCP_PAGE_GROUPS.filter(group=>group.id!==current.id); const definition=(name:string)=>toolDefinitions.find(([toolName])=>toolName===name); const registered=new Set(status.registeredToolNames); const signedOutCount=toolDefinitions.length-publicToolNames.size; const ready=status.supported&&status.registeredToolNames.length===status.availableTools; const statusLabel=!status.checked?'Checking browser…':!status.supported?'Browser setup needed':ready?'Browser ready':`${status.registeredToolNames.length} of ${status.availableTools} ready`; const statusCopy=!status.checked?'Checking for the page-level WebMCP API.':!status.supported?'Zingposts cannot see a usable modelContext API in this tab.':ready?`${status.availableTools} contextual tools are registered on ${status.surfaces.join(' and ')}.`:`${status.failedToolNames.length} tools could not register. Reload this tab or review the browser setup.`;
  useEffect(()=>setOpen(false),[contextId]);
  return <aside className={`webmcp-page-guide ${open?'open':''}`} aria-label="WebMCP tools for this page">
    {open&&<section className="webmcp-page-panel" role="dialog" aria-modal="false" aria-label={`WebMCP tools for ${current.label}`}>
      <header><div><small>For outside agents</small><h2>{current.label}</h2></div><button aria-label="Close WebMCP tool guide" onClick={()=>setOpen(false)}>×</button></header>
      <section className={`webmcp-runtime ${ready?'ready':status.supported?'partial':'unavailable'}`} data-testid="webmcp-runtime-status"><i/><div><b>{statusLabel}</b><span>{statusCopy}</span></div></section>
      {!status.supported&&status.checked&&<section className="webmcp-setup"><b>Enable WebMCP, then reopen this tab</b><p>Use a WebMCP-capable Chromium browser. In compatible experimental Chrome builds, enable <code>chrome://flags/#enable-webmcp-testing</code> and relaunch. This page can confirm the browser API; your outside agent must still access this same tab.</p></section>}
      <section className="webmcp-auth-state"><b>{authenticated?'Signed in workspace':'Public, signed-out session'}</b><span>{authenticated?`${status.availableTools} active here · ${toolDefinitions.length} in the complete catalog.`:`${publicToolNames.size} public tools can register now; ${signedOutCount} unlock after sign-in.`}</span></section>
      <section className="webmcp-progressive"><b>Progressive discovery</b><p>The front-door index stays available everywhere. Page-specific tools register only where they are useful, keeping the agent’s active catalog focused.</p><span><code>get_capability_index</code><code>get_capability_group</code><code>navigate_to_workspace</code></span></section>
      <p>{current.copy}</p>
      <div className="webmcp-current-tools">{current.tools.map(name=>{const item=definition(name);const authAvailable=authenticated||publicToolNames.has(name);const isRegistered=registered.has(name);return <article key={name} className={!authAvailable?'locked':isRegistered?'registered':'unavailable'}><div><code>{name}</code><span className="tool-flags"><em>{READ_ONLY_TOOLS.has(name)?'read':'write'}</em>{CONSEQUENTIAL_TOOLS.has(name)&&<em className="approval">approval</em>}<em className="availability">{!authAvailable?'sign in':isRegistered?'ready':status.supported?'other page':'browser setup'}</em></span></div><span>{item?.[1]??'Available on this page.'}</span></article>})}</div>
      <details className="webmcp-other-pages"><summary><span>Tools activated on other pages</span><b>{toolDefinitions.length-status.availableTools} inactive here</b></summary><div>{others.map(group=><details key={group.id}><summary><span>{group.label}</span><b>{group.tools.length}</b></summary><div>{group.tools.map(name=><code key={name} className={!authenticated&&!publicToolNames.has(name)?'locked':'inactive-context'}>{name}</code>)}</div></details>)}</div></details>
      <footer><span>Use the capability index to choose a workspace; navigation updates both the human view and active agent tools.</span><a href="/agents">Open full technical map</a></footer>
    </section>}
    <button data-testid="page-webmcp-tools" className={`webmcp-page-trigger ${ready?'ready':status.supported?'partial':'unavailable'}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span className="webmcp-spark">⌁</span><span><b>WebMCP tools</b><small>{statusLabel}</small></span><em>{open?'×':'?'}</em></button>
  </aside>
}

function GuestWelcome({
  state,
  load,
  setToast,
  toast,
  webmcpStatus,
}: {
  state: GuestState;
  load: () => Promise<void>;
  setToast: (value: string) => void;
  toast: string;
  webmcpStatus: WebMCPRuntimeStatus;
}) {
  const setup = state.pendingSetup?.found ? state.pendingSetup : null;
  const [mode, setMode] = useState<"prototype" | "login" | "sent" | null>(
    setup ? "prototype" : null,
  );
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get(
      "auth_error",
    );
    if (authError) setToast(authError);
  }, [setToast]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "prototype") {
        if (!name.trim() || !email.includes("@"))
          throw new Error(
            "Enter a name and valid email for the prototype workspace.",
          );
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "sign-in", name, email }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(
            body.error ?? "Unable to open the prototype workspace.",
          );
        await load();
        return;
      }
      if (mode === "login") {
        const response = await fetch("/api/auth/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ intent: "login", email }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(
            body.error ?? "Unable to send the secure sign-in link.",
          );
        setMode("sent");
        setToast("Secure sign-in link sent. Open it to finish signing in.");
        return;
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="welcome-shell">
      <header className="welcome-nav">
        <span className="brand">
          <span className="brand-mark">Z</span>
          <span>Zingposts</span>
        </span>
        <span className="no-ai-pill">
          Works with your agent · no built-in AI
        </span>
      </header>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="eyebrow">A shared marketplace workspace</p>
          <h1>
            Interesting things,
            <br />
            organized together.
          </h1>
          <p>
            Zingposts owns the listings, boards, alerts, research, and deal
            workflow. You bring the judgment—and, if you want one, your own
            agent.
          </p>
          <div className="welcome-actions">
            <button
              data-testid="continue-workspace"
              className="welcome-primary"
              onClick={() => setMode("login")}
            >
              Continue to my workspace
            </button>
            <button
              data-testid="person-first"
              className="welcome-secondary"
              onClick={() => setMode("prototype")}
            >
              Try a prototype workspace
            </button>
          </div>
          <small>
            Prototype work is instant. Supabase email authentication begins only
            when you verify a workspace for real marketplace actions.
          </small>
        </div>
        <div className="welcome-collage">
          {state.listings.slice(0, 4).map((listing, index) => (
            <article key={listing.id} style={{ "--i": index } as any}>
              <img src={listing.image} alt="" />
              <span>{listing.year}</span>
              <b>{listing.title}</b>
              <small>{money(listing.price)}</small>
            </article>
          ))}
        </div>
      </section>
      {state.agentAuthenticated && (
        <section className="handoff-card authenticated-agent">
          <div className="handoff-icon">A</div>
          <div>
            <p className="eyebrow">Agent authenticated</p>
            <h2>
              {state.agentSession?.name} can resume private workspace work
            </h2>
            <p>
              Its revocable session is active. Sign in with Supabase to open the
              same canvas as the human.
            </p>
          </div>
          <button onClick={() => setMode("login")}>Open my workspace</button>
        </section>
      )}
      {setup && (
        <section className="handoff-card" data-testid="agent-handoff">
          <div className="handoff-icon">A</div>
          <div>
            <p className="eyebrow">Your agent brought you here</p>
            <h2>{setup.agent_name} prepared a prototype workspace</h2>
            <p>
              Open or resume the prototype instantly. Supabase verification will
              be required before anything leaves the workspace.
            </p>
          </div>
          <button onClick={() => setMode("prototype")}>Continue</button>
        </section>
      )}
      <section className="arrival-paths" id="agent-first">
        <article>
          <span>01</span>
          <p className="eyebrow">Explore freely</p>
          <h2>Start with a prototype workspace</h2>
          <p>
            Browse, save, organize, research, and draft without an account
            ceremony.
          </p>
          <ol>
            <li>Use any test email</li>
            <li>Build a useful workspace</li>
            <li>Upgrade only when needed</li>
          </ol>
        </article>
        <article>
          <span>02</span>
          <p className="eyebrow">Cross the boundary</p>
          <h2>Verify a real email with Supabase</h2>
          <p>
            Before publishing or contacting anyone, replace the test email and
            prove you control the real address.
          </p>
          <ol>
            <li>Request a secure email link</li>
            <li>Verify the email</li>
            <li>Workspace ownership becomes durable</li>
          </ol>
        </article>
        <article>
          <span>03</span>
          <p className="eyebrow">Bring your agent</p>
          <h2>Issue one revocable code</h2>
          <p>
            Verified users give an outside agent a single-use, expiring
            code—never their own login.
          </p>
          <ol>
            <li>User issues the code</li>
            <li>Agent exchanges it once</li>
            <li>Human still approves outbound actions</li>
          </ol>
        </article>
      </section>
      {mode && (
        <div className="modal-backdrop">
          <section
            className="modal sign-in-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              mode === "prototype"
                ? "Open a prototype workspace"
                : "Continue to a verified workspace"
            }
          >
            <button
              className="modal-close"
              aria-label="Close workspace access"
              onClick={() => setMode(null)}
            >
              ×
            </button>
            <p className="eyebrow">
              {mode === "prototype"
                ? "Prototype access"
                : "Supabase authentication"}
            </p>
            <h2>
              {mode === "prototype"
                ? "Start or resume a prototype"
                : mode === "login"
                  ? "Continue to my workspace"
                  : "Check your email"}
            </h2>
            <p className="modal-copy">
              {mode === "prototype"
                ? "Use any email while exploring. Reuse the same email to return until you verify the workspace."
                : mode === "login"
                  ? "Enter the real email connected to your verified workspace."
                  : `We sent a secure sign-in link to ${email}. Open it to return to Zingposts and sign in automatically.`}
            </p>
            {mode === "sent" ? (
              <section className="email-link-sent" role="status">
                <span>✉</span>
                <div>
                  <b>Open the link in your email</b>
                  <p>
                    No code is required. The link signs this browser in through
                    Supabase.
                  </p>
                </div>
                <button
                  className="primary-action"
                  onClick={() => window.location.reload()}
                >
                  I opened the link — check again
                </button>
                <button
                  className="secondary-action"
                  onClick={() => setMode("login")}
                >
                  Use a different email or resend
                </button>
              </section>
            ) : (
              <form onSubmit={submit}>
                {mode === "prototype" && (
                  <label>
                    Name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="Your name"
                      required
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <button
                  data-testid="sign-in-submit"
                  className="primary-action"
                  disabled={
                    busy ||
                    (mode === "prototype" && !name.trim()) ||
                    !email.includes("@")
                  }
                >
                  {busy
                    ? "Working…"
                    : mode === "prototype"
                      ? "Open prototype"
                      : "Email me a secure link"}
                </button>
              </form>
            )}
            <div className="sign-in-trust">
              <span>✓</span>
              <p>
                {mode === "prototype" ? (
                  <>
                    <b>No real authentication yet.</b> Safe workspace actions
                    only.
                  </>
                ) : (
                  <>
                    <b>Real authentication.</b> Supabase verifies control of
                    this email.
                  </>
                )}
              </p>
            </div>
          </section>
        </div>
      )}
      <WebMCPToolGuide
        view="agent"
        detailOpen={false}
        authenticated={Boolean(state.agentAuthenticated)}
        status={webmcpStatus}
      />
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </main>
  );
}

function PendingAgentSetup({
  setup,
  dismiss,
}: {
  setup: Row;
  dismiss: () => void;
}) {
  return (
    <section className="pending-setup" data-testid="pending-agent-setup">
      <span className="agent-orb">A</span>
      <div>
        <small>Attaching agent-first setup</small>
        <b>{setup.agent_name} is connecting for safe workspace work</b>
        <span>
          No scope approval is needed for browsing, organizing, research,
          alerts, or drafts. Publishing and outbound commerce stay protected.
        </span>
      </div>
      <button className="soft-button" onClick={dismiss}>
        Cancel
      </button>
    </section>
  );
}

function WorkspaceSidebar({state,webmcpStatus,view,query,setQuery,category,viewMode,filtersExpanded,draggingId,collapsed,accountOpen,setAccountOpen,nav,toggle,setModal,signOut,setMarketplaceView,onDrop}:{state:State;webmcpStatus:WebMCPRuntimeStatus;view:string;query:string;setQuery:(value:string)=>void;category:string;viewMode:string;filtersExpanded:boolean;draggingId:string|null;collapsed:boolean;accountOpen:boolean;setAccountOpen:(value:boolean)=>void;nav:(value:string)=>void;toggle:()=>void;setModal:(value:ModalType)=>void;signOut:()=>void;setMarketplaceView:(value:Row)=>void;onDrop:(boardId:string,listingId:string)=>void}){
  const [inviteCopyState,setInviteCopyState]=useState<'idle'|'copied'|'failed'>('idle'); const inviteCopied=inviteCopyState==='copied';
  const attentionCount=state.collaborationItems.filter(item=>item.status==='open').length+state.confirmations.filter(item=>item.status==='pending').length;
  const copyAgentInvite=async()=>{try{let prompt=createAgentInvitePrompt(window.location.origin,webmcpStatus);if(state.verification.status==='verified'){const invite=await postAction('create_agent_auth_code',{name:'My outside agent'},{type:'human'});prompt+=`\n\nOne-time Zingposts agent authentication\nCode: ${invite.code}\nExpires: ${invite.expiresAt}\nCall authenticate_agent with this code immediately, then discard it. Do not paste it into logs, memory, or chat after the exchange succeeds.`;}const copied=await writeClipboardText(prompt);setInviteCopyState(copied?'copied':'failed');}catch{setInviteCopyState('failed');}setTimeout(()=>setInviteCopyState('idle'),2600)};
  return <aside className={`sidebar ${collapsed?'collapsed':''} ${draggingId?'drop-mode':''}`}><div className="sidebar-main"><div className="rail-brand-row"><button className="brand plain rail-brand" onClick={()=>nav('browse')}><span className="brand-mark">Z</span><span className="rail-copy">Zingposts</span></button><div className="account-menu"><button data-testid="account-menu" className="avatar" aria-label={`Open account menu for ${state.user.displayName}`} title={state.user.email} onClick={()=>setAccountOpen(!accountOpen)}>{initials(state.user.displayName)}</button>{accountOpen&&<section className="account-popover"><small>{state.verification.status==='verified'?'Supabase account':'Prototype workspace'}</small><b>{state.user.displayName}</b><span>{state.user.email}</span><div className={`verification-line ${state.verification.status}`}><i/>{state.verification.status==='verified'?'Authenticated for marketplace actions':'Safe private work only'}</div>{state.verification.status!=='verified'&&<button data-testid="open-verification" onClick={()=>{setAccountOpen(false);setModal('verify')}}>Verify a real email</button>}<button data-testid="logout" onClick={signOut}>Log out</button></section>}</div></div><button data-testid="sidebar-toggle" className="sidebar-toggle" aria-label={collapsed?'Expand navigation':'Collapse navigation'} title={collapsed?'Expand navigation':'Collapse navigation'} onClick={toggle}>{collapsed?'›':'‹'}</button><label className="sidebar-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} onFocus={()=>nav('browse')} onKeyDown={event=>{if(event.key==='Enter')nav('browse')}} aria-label="Search Zingposts listings" placeholder="Search title, category, specs, seller…"/></label><div className="sidebar-create"><button data-testid="sell-item" className="rail-primary" onClick={()=>setModal('listing')}><span>＋</span><b>Sell an item</b></button><button title="Track a find" onClick={()=>setModal('track')}><span>↗</span><b>Track a find</b></button></div><section className="rail-canvas-controls"><div className="rail-control-heading"><small>Canvas</small><button className={filtersExpanded?'active':''} data-testid="filter-toggle" onClick={()=>setMarketplaceView({filtersExpanded:!filtersExpanded})}>Filters {category!=='All'?'1':''}</button></div><div className="view-switch rail-view-switch" aria-label="Canvas view"><button data-testid="view-gallery" className={viewMode==='gallery'?'active':''} title="Gallery" aria-label="Gallery view" onClick={()=>setMarketplaceView({mode:'gallery'})}>▦</button><button data-testid="view-focus" className={viewMode==='focus'?'active':''} title="Focus" aria-label="Focus slideshow view" onClick={()=>setMarketplaceView({mode:'focus'})}>▭</button><button data-testid="view-thumbnails" className={viewMode==='thumbnails'?'active':''} title="Thumbnails" aria-label="Thumbnail canvas view" onClick={()=>setMarketplaceView({mode:'thumbnails'})}>⠿</button></div>{filtersExpanded&&<div className="rail-filters" data-testid="filter-panel">{MARKETPLACE_CATEGORIES.map(item=><button key={item} className={category===item?'selected':''} onClick={()=>setMarketplaceView({category:item})}>{item}</button>)}</div>}</section><nav aria-label="Primary navigation"><p className="nav-label">Marketplace</p><Nav active={view==='browse'} icon="⌂" label="Browse" onClick={()=>nav('browse')}/><Nav active={view==='mine'} icon="◇" label="My listings" count={state.listings.filter(listing=>listing.owner_id===state.user.userId).length} onClick={()=>nav('mine')}/><p className="nav-label nav-space">Your workspace</p><Nav active={view==='workbench'} icon="A" label="Shared with agent" count={attentionCount} onClick={()=>nav('workbench')}/><Nav active={view==='saved'} icon="♡" label="Saved items" count={state.saved.length} onClick={()=>nav('saved')}/><Nav active={view==='inbox'} icon="↗" label="Messages & offers" count={state.messages.filter(message=>message.status==='draft').length+state.offers.filter(offer=>offer.status==='draft').length} onClick={()=>nav('inbox')}/><Nav active={view==='alerts'} icon="⌁" label="Alerts" count={state.alerts.length} onClick={()=>nav('alerts')}/><Nav active={view==='trades'} icon="⇄" label="Trade rooms" count={state.trades.length} onClick={()=>nav('trades')}/><Nav active={view==='activity'} icon="◷" label="Activity & undo" onClick={()=>nav('activity')}/><p className="nav-label nav-space board-label"><span>{draggingId?'Drop on a board':'Boards'}</span><button aria-label="Create a board" onClick={()=>setModal('board')}>＋</button></p><div className="rail-boards" aria-label="Boards">{state.boards.map(board=><BoardNav key={board.id} board={board} active={view===`board:${board.id}`} count={state.boardItems.filter(item=>item.board_id===board.id).length} draggingId={draggingId} onClick={()=>nav(`board:${board.id}`)} onDrop={onDrop}/>)}</div></nav></div><button data-testid="copy-agent-invite" aria-label="Copy a prompt to bring my agent" className={`sidebar-agent agent-invite ${inviteCopied?'copied':''}`} onClick={copyAgentInvite}><span className="mini-agent">A</span><span><strong>{inviteCopied?'Prompt copied':inviteCopyState==='failed'?'Copy blocked':'Bring my agent'}</strong><small>{inviteCopied?'Paste it into your agent':inviteCopyState==='failed'?'Allow clipboard access and try again':state.verification.status==='verified'?'Creates a one-time agent code':webmcpStatus.supported?'Browser ready · copy connection prompt':'Includes WebMCP setup check'}</small></span><b>{inviteCopied?'✓':inviteCopyState==='failed'?'!':'⧉'}</b></button></aside>
}

function BoardNav({board,active,count,draggingId,onClick,onDrop}:{board:Row;active:boolean;count:number;draggingId:string|null;onClick:()=>void;onDrop:(boardId:string,listingId:string)=>void}){const [over,setOver]=useState(false);return <button title={board.name} data-board-id={board.id} data-testid={`board-drop-${board.id}`} className={`nav-item board-nav ${active?'active':''} ${draggingId?'drop-target':''} ${over?'drop-ready':''}`} style={{'--board-color':board.color} as any} onClick={onClick} onDragEnter={event=>{event.preventDefault();setOver(true)}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';setOver(true)}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOver(false)}} onDrop={event=>{event.preventDefault();event.stopPropagation();const listingId=event.dataTransfer.getData('application/x-zingposts-listing')||event.dataTransfer.getData('text/plain')||draggingId||'';setOver(false);if(listingId)onDrop(board.id,listingId)}}><i className="dot" style={{background:board.color}}/><span className="nav-text">{over?'Drop here':board.name}</span><em>{count}</em></button>}

function Nav({icon,label,count,active,color,onClick}:{icon?:string;label:string;count?:number;active?:boolean;color?:string;onClick:()=>void}){return <button title={label} data-testid={`nav-${label.toLowerCase().replaceAll(' ','-').replace('&','and')}`} className={`nav-item ${active?'active':''}`} onClick={onClick}>{color?<i className="dot" style={{background:color}}/>:<span className="nav-icon">{icon}</span>}<span className="nav-text">{label}</span>{typeof count==='number'&&<em>{count}</em>}</button>}

function MarketplaceView({view,items,viewMode,selectedId,setSelectedId,openDetail,savedIds,state,act,draggingId,setDraggingId,dropOnBoard}:{view:string;items:Row[];viewMode:string;selectedId:string;setSelectedId:(v:string)=>void;openDetail:(id:string)=>void;savedIds:Set<string>;state:State;act:any;draggingId:string|null;setDraggingId:(value:string|null)=>void;dropOnBoard:(boardId:string,listingId:string)=>void}){
  const activeBoard=view.startsWith('board:')?state.boards.find(board=>`board:${board.id}`===view):undefined;
  const title=view==='mine'?'Your listings':view==='saved'?'Saved finds':activeBoard?.name;
  const selectedIndex=Math.max(0,items.findIndex(item=>item.id===selectedId)); const focused=items[selectedIndex]??items[0];
  const boardsByListing=useMemo(()=>{const boardMap=new Map(state.boards.map(board=>[board.id,board]));const result=new Map<string,Row[]>();for(const membership of state.boardItems){const board=boardMap.get(membership.board_id);if(!board)continue;result.set(membership.listing_id,[...(result.get(membership.listing_id)??[]),board])}return result},[state.boards,state.boardItems]);
  const move=useCallback((direction:number)=>{if(!items.length)return;const next=(selectedIndex+direction+items.length)%items.length;setSelectedId(items[next].id)},[items,selectedIndex,setSelectedId]);
  useEffect(()=>{if(viewMode!=='focus')return;const onKey=(event:KeyboardEvent)=>{if(event.key==='ArrowRight')move(1);if(event.key==='ArrowLeft')move(-1)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[viewMode,move]);
  const save=(item:Row)=>act(savedIds.has(item.id)?'unsave_listing':'save_listing',{listingId:item.id},savedIds.has(item.id)?'Removed from saved items.':'Saved to your workspace.');
  const removeFromBoard=activeBoard?(listingId:string)=>act('remove_listings_from_board',{boardId:activeBoard.id,listingIds:[listingId]},`Removed from ${activeBoard.name}.`):undefined;
  return <><div className="canvas-context"><div><p>Virginia · 250 miles</p>{title&&<h1>{title}</h1>}</div><span>{items.length} finds</span></div>{viewMode==='focus'&&focused?<FocusCanvas item={focused} index={selectedIndex} count={items.length} saved={savedIds.has(focused.id)} boards={state.boards} memberBoards={boardsByListing.get(focused.id)??[]} activeBoard={activeBoard} move={move} openDetail={openDetail} save={()=>save(focused)} removeFromBoard={removeFromBoard} setDraggingId={setDraggingId} addToBoard={boardId=>dropOnBoard(boardId,focused.id)}/>:viewMode==='thumbnails'?<ThumbnailCanvas items={items} boards={state.boards} boardsByListing={boardsByListing} savedIds={savedIds} draggingId={draggingId} activeBoard={activeBoard} setDraggingId={setDraggingId} openDetail={openDetail} save={save} removeFromBoard={removeFromBoard} addToBoard={dropOnBoard}/>:<GalleryCanvas items={items} boardsByListing={boardsByListing} selectedId={selectedId} savedIds={savedIds} draggingId={draggingId} activeBoard={activeBoard} setDraggingId={setDraggingId} addToBoard={dropOnBoard} openDetail={openDetail} save={save} removeFromBoard={removeFromBoard}/>} {items.length===0&&<div className="empty"><b>No matches yet</b><p>Try another search or broaden the criteria.</p></div>}</>;
}

function makeListingDragPreview(item:Row,className:string){
  const preview=document.createElement('div'); preview.className=className;
  const image=document.createElement('img'); image.src=String(item.image??''); image.alt='';
  const copy=document.createElement('span'); const title=document.createElement('b'); title.textContent=String(item.title??'Listing'); const hint=document.createElement('small'); hint.textContent='Drop on a board'; copy.appendChild(title); copy.appendChild(hint); preview.appendChild(image); preview.appendChild(copy); document.body.appendChild(preview); return preview;
}

function useBoardPointerDrag(setDraggingId:(id:string|null)=>void,onDrop:(boardId:string,listingId:string)=>void){
  const start=useRef<{x:number;y:number;item:Row;pointerId:number}|null>(null); const moved=useRef(false); const preview=useRef<HTMLDivElement|null>(null); const onDropRef=useRef(onDrop);
  useEffect(()=>{onDropRef.current=onDrop},[onDrop]);
  const clearHighlight=useCallback(()=>document.querySelectorAll('[data-board-id].pointer-drop-ready').forEach(element=>element.classList.remove('pointer-drop-ready')),[]);
  const removePreview=useCallback(()=>{preview.current?.remove();preview.current=null},[]);
  const finish=useCallback((x:number,y:number)=>{const current=start.current;if(!current)return;const board=(document.elementFromPoint(x,y) as HTMLElement|null)?.closest<HTMLElement>('[data-board-id]');if(moved.current&&board?.dataset.boardId)onDropRef.current(board.dataset.boardId,current.item.id);clearHighlight();removePreview();setDraggingId(null);start.current=null},[clearHighlight,removePreview,setDraggingId]);
  useEffect(()=>{const release=(event:PointerEvent|MouseEvent)=>finish(event.clientX,event.clientY);const blur=()=>{clearHighlight();removePreview();setDraggingId(null);start.current=null};window.addEventListener('pointerup',release,true);window.addEventListener('mouseup',release,true);window.addEventListener('blur',blur);return()=>{window.removeEventListener('pointerup',release,true);window.removeEventListener('mouseup',release,true);window.removeEventListener('blur',blur);removePreview()}},[clearHighlight,finish,removePreview,setDraggingId]);
  const begin=(event:React.PointerEvent<HTMLElement>,item:Row)=>{if(event.button!==0||(event.target as HTMLElement).closest('button'))return;start.current={x:event.clientX,y:event.clientY,item,pointerId:event.pointerId};moved.current=false;event.currentTarget.setPointerCapture?.(event.pointerId)};
  const move=(event:React.PointerEvent<HTMLElement>)=>{const current=start.current;if(!current)return;if(Math.hypot(event.clientX-current.x,event.clientY-current.y)<7&&!moved.current)return;event.preventDefault();if(!moved.current){moved.current=true;setDraggingId(current.item.id);preview.current=makeListingDragPreview(current.item,'listing-drag-preview pointer') as HTMLDivElement}if(preview.current){preview.current.style.left=`${event.clientX+18}px`;preview.current.style.top=`${event.clientY+14}px`}clearHighlight();const board=(document.elementFromPoint(event.clientX,event.clientY) as HTMLElement|null)?.closest<HTMLElement>('[data-board-id]');board?.classList.add('pointer-drop-ready')};
  const end=(event:React.PointerEvent<HTMLElement>)=>finish(event.clientX,event.clientY);
  const cancel=()=>{clearHighlight();removePreview();setDraggingId(null);start.current=null;moved.current=false};
  const consumeClick=()=>{if(!moved.current)return false;moved.current=false;return true};
  return {begin,move,end,cancel,consumeClick}
}

function BoardBadges({boards}:{boards:Row[]}){if(!boards.length)return null;return <div className="listing-board-badges" aria-label={`In boards: ${boards.map(board=>board.name).join(', ')}`}>{boards.slice(0,3).map(board=><span className="listing-board-badge" style={{'--board-color':board.color} as any} title={board.name} key={board.id}><i/><b>{board.name}</b></span>)}{boards.length>3&&<span className="listing-board-more">+{boards.length-3}</span>}</div>}

function listingFactEntries(attributes:Row={}){return Object.entries(attributes).filter(([key,value])=>!key.startsWith('_')&&['string','number','boolean'].includes(typeof value));}

function GalleryCanvas({items,boardsByListing,selectedId,savedIds,draggingId,activeBoard,setDraggingId,addToBoard,openDetail,save,removeFromBoard}:{items:Row[];boardsByListing:Map<string,Row[]>;selectedId:string;savedIds:Set<string>;draggingId:string|null;activeBoard?:Row;setDraggingId:(id:string|null)=>void;addToBoard:(boardId:string,listingId:string)=>void;openDetail:(id:string)=>void;save:(item:Row)=>void;removeFromBoard?:((listingId:string)=>void)}){const pointer=useBoardPointerDrag(setDraggingId,addToBoard);return <div className="listing-grid">{items.map(item=><article role="button" tabIndex={0} aria-label={`Open ${item.title}`} data-testid={`listing-${item.id}`} className={`listing-card ${selectedId===item.id?'selected':''} ${draggingId===item.id?'dragging':''}`} key={item.id} onPointerDown={event=>pointer.begin(event,item)} onPointerMove={pointer.move} onPointerUp={pointer.end} onPointerCancel={pointer.cancel} onClick={()=>{if(!pointer.consumeClick())openDetail(item.id)}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')openDetail(item.id)}}><div className="listing-photo"><img draggable={false} src={item.image} alt={item.title}/><span className="photo-year">{item.year??'Tracked'}</span><button className={savedIds.has(item.id)?'saved':''} aria-label={`Save ${item.title}`} onClick={event=>{event.stopPropagation();save(item)}}>{savedIds.has(item.id)?'♥':'♡'}</button><span className="fit-badge">{item.origin_type==='external'?'Outside listing':item.condition}</span><BoardBadges boards={boardsByListing.get(item.id)??[]}/></div><div className="listing-body"><div className="listing-title-row"><div><p>{item.category}</p><h2>{item.title}</h2></div><strong>{money(item.price)}</strong></div><p className="listing-meta">{listingFactEntries(item.attributes).slice(0,3).map(([,value])=>value).join(' · ')}</p><div className="listing-footer"><span>{item.location}</span><span>{item.watchers?`${item.watchers} watching`:'Tracked today'}</span></div>{activeBoard&&<button className="remove-board-item" data-testid={`remove-${item.id}-from-${activeBoard.id}`} aria-label={`Remove ${item.title} from ${activeBoard.name}`} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();removeFromBoard?.(item.id)}}><span>−</span> Remove from {activeBoard.name}</button>}</div></article>)}</div>}

function FocusCanvas({item,index,count,saved,boards,memberBoards,activeBoard,move,openDetail,save,removeFromBoard,setDraggingId,addToBoard}:{item:Row;index:number;count:number;saved:boolean;boards:Row[];memberBoards:Row[];activeBoard?:Row;move:(n:number)=>void;openDetail:(id:string)=>void;save:()=>void;removeFromBoard?:((listingId:string)=>void);setDraggingId:(value:string|null)=>void;addToBoard:(boardId:string)=>void}){const [boardsOpen,setBoardsOpen]=useState(false);const pointer=useBoardPointerDrag(setDraggingId,boardId=>addToBoard(boardId));return <section className="focus-canvas" data-testid="focus-canvas"><div className="focus-photo" data-testid={`focus-${item.id}`} onPointerDown={event=>pointer.begin(event,item)} onPointerMove={pointer.move} onPointerUp={pointer.end} onPointerCancel={pointer.cancel}><img draggable={false} src={item.image} alt={item.title}/><BoardBadges boards={memberBoards}/><button className="focus-arrow previous" aria-label="Previous find" onClick={()=>move(-1)}>‹</button><button className="focus-arrow next" aria-label="Next find" onClick={()=>move(1)}>›</button><span className="focus-count">{index+1} / {count}</span><div className="focus-caption"><div><small>{item.year} · {item.category} · {item.location}</small><h2>{item.title}</h2><strong>{money(item.price)}</strong></div><div className="focus-actions"><button aria-label={`${saved?'Remove':'Save'} ${item.title}`} onClick={save}>{saved?'♥ Saved':'♡ Save'}</button>{activeBoard&&<button className="remove-board-control" data-testid={`focus-remove-${item.id}`} aria-label={`Remove ${item.title} from ${activeBoard.name}`} onClick={()=>removeFromBoard?.(item.id)}>− Remove</button>}<div className="board-picker"><button aria-label={`Add ${item.title} to a board`} onClick={()=>setBoardsOpen(value=>!value)}>＋ Board</button>{boardsOpen&&<div>{boards.map(board=><button aria-label={`Add ${item.title} to ${board.name}`} key={board.id} onClick={()=>{addToBoard(board.id);setBoardsOpen(false)}}>{board.name}</button>)}</div>}</div><button className="primary-action" aria-label={`Open details for ${item.title}`} onClick={()=>openDetail(item.id)}>More details</button></div></div></div><div className="focus-hint">Drag this find to a board in the rail, use ← → to flip, or open the full record.</div></section>}

function ThumbnailCanvas({items,boards,boardsByListing,savedIds,draggingId,activeBoard,setDraggingId,openDetail,save,removeFromBoard,addToBoard}:{items:Row[];boards:Row[];boardsByListing:Map<string,Row[]>;savedIds:Set<string>;draggingId:string|null;activeBoard?:Row;setDraggingId:(id:string|null)=>void;openDetail:(id:string)=>void;save:(item:Row)=>void;removeFromBoard?:((listingId:string)=>void);addToBoard:(boardId:string,listingId:string)=>void}){const pointer=useBoardPointerDrag(setDraggingId,addToBoard);return <section className="thumbnail-canvas" data-testid="thumbnail-canvas">{items.map(item=><ThumbnailCard key={item.id} item={item} boards={boards} memberBoards={boardsByListing.get(item.id)??[]} saved={savedIds.has(item.id)} dragging={draggingId===item.id} activeBoard={activeBoard} pointer={pointer} openDetail={openDetail} save={save} removeFromBoard={removeFromBoard} addToBoard={addToBoard}/>)}</section>}

function ThumbnailCard({item,boards,memberBoards,saved,dragging,activeBoard,pointer,openDetail,save,removeFromBoard,addToBoard}:{item:Row;boards:Row[];memberBoards:Row[];saved:boolean;dragging:boolean;activeBoard?:Row;pointer:ReturnType<typeof useBoardPointerDrag>;openDetail:(id:string)=>void;save:(item:Row)=>void;removeFromBoard?:((listingId:string)=>void);addToBoard:(boardId:string,listingId:string)=>void}){const [boardMenu,setBoardMenu]=useState(false);return <article data-testid={`thumbnail-${item.id}`} className={dragging?'dragging':''} tabIndex={0} onPointerDown={event=>pointer.begin(event,item)} onPointerMove={pointer.move} onPointerUp={pointer.end} onPointerCancel={pointer.cancel}><img draggable={false} src={item.image} alt={item.title}/><BoardBadges boards={memberBoards}/><div className="thumbnail-overlay"><small>{item.year} · {item.category}</small><b>{item.title}</b><strong>{money(item.price)}</strong><span><button aria-label={`Save ${item.title}`} onClick={()=>save(item)}>{saved?'♥':'♡'}</button><button aria-label={`Open details for ${item.title}`} onClick={()=>openDetail(item.id)}>Details</button>{activeBoard&&<button className="remove-board-control" data-testid={`thumbnail-remove-${item.id}`} aria-label={`Remove ${item.title} from ${activeBoard.name}`} onClick={()=>removeFromBoard?.(item.id)}>− Board</button>}<button aria-label={`Add ${item.title} to a board`} onClick={()=>setBoardMenu(value=>!value)}>＋ Board</button></span>{boardMenu&&<div className="thumbnail-board-menu">{boards.map(board=><button aria-label={`Add ${item.title} to ${board.name}`} key={board.id} onClick={()=>{addToBoard(board.id,item.id);setBoardMenu(false)}}>{board.name}</button>)}</div>}</div></article>}

function priceWorkspace(notes:Row[]){
  const sources=notes.flatMap(note=>Array.isArray(note.sources)?note.sources:[]); const comparables=sources.filter(source=>source?.type==='price_comparable'&&Number(source.soldPrice)>0).map(source=>({...source,soldPrice:Number(source.soldPrice)})).sort((a,b)=>a.soldPrice-b.soldPrice); const prices=comparables.map(item=>item.soldPrice); const middle=Math.floor(prices.length/2); const median=prices.length?(prices.length%2?prices[middle]:Math.round((prices[middle-1]+prices[middle])/2)):null; const plans=sources.filter(source=>source?.type==='offer_strategy'); return {comparables,median,minimum:prices[0]??null,maximum:prices.at(-1)??null,plan:plans[0]??null};
}

function ListingDetail({listing,items,state,userMap,saved,tab,setTab,act,setModal,close,move}:{listing:Row;items:Row[];state:State;userMap:Row;saved:boolean;tab:string;setTab:(v:string)=>void;act:any;setModal:(v:ModalType)=>void;close:()=>void;move:(direction:number)=>void}){
  const notes=state.research.filter(note=>note.listing_id===listing.id); const pricing=priceWorkspace(notes); const seller=userMap[listing.owner_id]; const mine=listing.owner_id===state.user.userId&&listing.origin_type==='native'; const index=Math.max(0,items.findIndex(item=>item.id===listing.id)); const imageMeta=listing.attributes?._primaryImage as Row|undefined;
  return <section className="detail-screen" role="dialog" aria-modal="true" aria-label={listing.title}>
    <header className="detail-screen-nav"><button data-testid="detail-close" className="detail-back" onClick={close}>← <span>Back to results</span></button><div className="detail-progress"><small>{listing.category}</small><b>{index+1} of {items.length}</b></div><div className="detail-arrows"><button data-testid="detail-previous" aria-label="Previous listing" disabled={items.length<2} onClick={()=>move(-1)}>‹</button><button data-testid="detail-next" aria-label="Next listing" disabled={items.length<2} onClick={()=>move(1)}>›</button></div></header>
    <div className="detail-screen-layout"><section className="detail-media"><img src={listing.image} alt={imageMeta?.altText??listing.title}/><div className="detail-media-caption"><span className={`native-pill ${listing.origin_type}`}>{listing.origin_type==='native'?'Zingposts native listing':'Tracked outside source'}</span><span>{listing.year??'Year unknown'} · {listing.condition} · {listing.location}</span>{imageMeta?.sourceUrl?<a href={imageMeta.sourceUrl} target="_blank" rel="noreferrer">Photo source: {imageMeta.sourceLabel??'View attribution'}</a>:<small>Use ← and → to move between listings</small>}</div></section>
      <aside className="detail-content"><div className="detail-title"><div><p className="eyebrow">{listing.origin_type==='external'?'Outside listing snapshot':'Available on Zingposts'}</p><h1>{listing.title}</h1><p>{seller?.name??'Outside seller'} · {listing.location}</p></div><button className={`detail-save ${saved?'saved':''}`} aria-label={saved?'Remove from saved items':'Save listing'} onClick={()=>act(saved?'unsave_listing':'save_listing',{listingId:listing.id})}>{saved?'♥':'♡'}</button></div><div className="detail-price"><strong>{money(listing.price)}</strong><span>{listing.status}</span></div><div className="signal-row detail-signals"><span><b>{listing.completeness}%</b> complete</span><span><b>{listing.watchers}</b> watchers</span><span><b>{state.offers.filter(offer=>offer.listing_id===listing.id).length}</b> offers</span></div><div className="detail-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='research'?'active':''} onClick={()=>setTab('research')}>Research</button><button className={tab==='deal'?'active':''} onClick={()=>setTab('deal')}>Deal</button></div><div className="detail-scroll">{tab==='overview'?<><section className="inspector-section"><div className="section-title"><h3>About this listing</h3><span>{listing.updated_at?`Updated ${relative(listing.updated_at)}`:'Current listing'}</span></div><p className="detail-copy">{listing.description}</p><div className="fact-grid">{listingFactEntries(listing.attributes).map(([key,value])=><span key={key}><small>{key}</small><b>{String(value)}</b></span>)}</div></section><section className="inspector-section"><div className="section-title"><h3>Listing readiness</h3><span>Deterministic checks</span></div><div className="assessment good"><b>{listing.completeness>85?'Strong record':'Needs review'}</b><p>{listing.origin_type==='external'?'Source details are incomplete and should be verified before contact.':'The listing is unusually complete. Verify title, condition, and transport before making an offer.'}</p></div></section>{mine&&<section className="inspector-section seller-controls"><div className="section-title"><h3>Seller controls</h3><span>{listing.status}</span></div>{listing.status==='draft'?<button data-testid="request-publish" onClick={()=>act('request_listing_publish',{listingId:listing.id},'Publishing is ready for confirmation.')}>Request publication</button>:<button onClick={()=>act('set_listing_availability',{listingId:listing.id,status:'sold'},'Listing marked sold.')}>Mark sold</button>}</section>}</>:tab==='research'?<><section className="inspector-section price-workspace" data-testid="price-workspace"><div className="section-title"><div><h3>Price & offer research</h3><p>Shared evidence and transparent math—not an appraisal.</p></div><span>{pricing.comparables.length} comparables</span></div><div className="price-metrics"><span><small>Current ask</small><b>{money(listing.price)}</b></span><span><small>Comparable median</small><b>{pricing.median==null?'Need comps':money(pricing.median)}</b></span><span><small>Recorded range</small><b>{pricing.minimum==null?'No range':`${money(pricing.minimum)}–${money(pricing.maximum)}`}</b></span><span><small>Private target</small><b>{pricing.plan?money(pricing.plan.targetOffer):'Not set'}</b></span></div><div className="price-workspace-actions"><button data-testid="add-price-comparable" onClick={()=>setModal('comparable')}>＋ Add comparable</button><button data-testid="create-offer-plan" onClick={()=>setModal('plan')}>{pricing.plan?'Update offer plan':'Create offer plan'}</button></div><p className="price-agent-note"><span className="agent-orb">A</span><span><b>Outside-agent workflow</b> Use <code>get_price_research</code>, record cited sales with <code>record_price_comparable</code>, then run <code>analyze_price_and_offer</code> with explicit repair, transport, tax, contingency, and budget assumptions.</span></p></section><section className="inspector-section research-list"><div className="section-title"><h3>Research notebook</h3><button onClick={()=>setModal('research')}>＋ Add research</button></div>{notes.map(note=><article key={note.id}><b>{note.title}</b><p>{note.body}</p><small>{note.confidence} confidence · {(note.sources??[]).length} sources</small></article>)}{!notes.length&&<div className="empty"><b>No research yet</b><p>You or a connected external agent can build an inspection, provenance, and price notebook here.</p></div>}</section></>:<section className="inspector-section"><div className="section-title"><h3>Deal workspace</h3><span>{state.conversations.filter(conversation=>conversation.listing_id===listing.id).length} conversations</span></div><div className="deal-stack"><button onClick={()=>setModal('message')}>Draft seller message</button><button onClick={()=>setModal('offer')}>Prepare an offer</button><button onClick={()=>setModal('trade')}>Add to a trade room</button></div></section>}</div><div className="detail-actions"><button className="primary-action" onClick={()=>setTab('research')}>Open research notebook</button><button className="secondary-action" onClick={()=>setModal('message')}>Message seller</button></div></aside>
    </div>
  </section>
}

function AgentPulse({pulse}:{pulse:Row}){return <section className={`agent-pulse ${pulse.status}`} role="status"><span className="agent-orb">A</span><div><small>Your agent is working</small><b>{pulse.status==='working'?`Using ${String(pulse.name).replaceAll('_',' ')}…`:`Finished ${String(pulse.name).replaceAll('_',' ')}`}</b></div><i/></section>}

function WorkbenchItem({item,state,act}:{item:Row;state:State;act:any}){
  const [response,setResponse]=useState(''); const listings=(item.listing_ids??[]).map((id:string)=>state.listings.find(listing=>listing.id===id)).filter(Boolean);
  const respond=async(decision:string,selectedOption?:string)=>{await act('respond_to_collaboration_item',{itemId:item.id,decision,response,selectedOption},'Your response is ready for the agent.');setResponse('')};
  return <article id={item.id} className={`workbench-item ${item.kind} ${item.status}`}><header><span>{item.created_by_type==='agent'?'A':initials(item.created_by_name)}</span><div><small>{item.created_by_name} · {item.kind}</small><h3>{item.title}</h3></div><em>{item.status.replaceAll('_',' ')}</em></header>{item.body&&<p>{item.body}</p>}{listings.length>0&&<div className="workbench-listings">{listings.map((listing:Row)=><a href={`/listings/${listing.id}`} key={listing.id}><img src={listing.image} alt=""/><span><b>{listing.title}</b><small>{money(listing.price)} · {listing.location}</small></span></a>)}</div>}{(item.options??[]).length>0&&<div className="workbench-options">{item.options.map((option:any)=><button aria-label={`Choose ${String(option.label??option)}`} key={String(option.value??option.label??option)} disabled={item.status!=='open'} onClick={()=>respond('accepted',String(option.value??option.label??option))}>{String(option.label??option)}</button>)}</div>}{item.status==='open'&&<div className="workbench-response"><label>Your response<textarea value={response} onChange={event=>setResponse(event.target.value)} placeholder="Add context the agent should use next…"/></label><span><button onClick={()=>respond('needs_changes')}>Ask for changes</button><button className="primary-action" onClick={()=>respond(item.kind==='question'?'answered':'accepted')}>{item.kind==='question'?'Send answer':'Accept recommendation'}</button></span></div>}{item.response&&<div className="human-response"><small>Human response</small><b>{item.response.decision}</b>{item.response.selectedOption&&<span>{item.response.selectedOption}</span>}{item.response.response&&<p>{item.response.response}</p>}</div>}</article>
}

function WorkbenchView({state,selectedSessionId,selectSession,act,review}:{state:State;selectedSessionId:string;selectSession:(id:string)=>void;act:any;review:(confirmation:Row)=>void}){
  const [loadingSample,setLoadingSample]=useState(false);
  const sessions=state.collaborationSessions; const session=sessions.find(item=>item.id===selectedSessionId)??sessions[0]; const items=session?state.collaborationItems.filter(item=>item.session_id===session.id):[]; const openItems=state.collaborationItems.filter(item=>item.status==='open'); const pending=state.confirmations.filter(item=>item.status==='pending');
  const loadSampleHandoff=async()=>{setLoadingSample(true);try{const boats=state.listings.filter(item=>item.category==='Boats').slice(0,3);const opened=await act('start_collaboration_session',{agentName:'Sample outside agent',objective:'Choose a characterful old boat for weekend use',listingIds:boats.map(item=>item.id),constraints:{budget:'under $20,000',priority:'condition and story'}},'Sample WebMCP session opened.',{type:'agent',name:'Sample outside agent'});await act('add_collaboration_item',{sessionId:opened.sessionId,kind:'recommendation',title:'Start with these three boats',body:'I ranked these for character, apparent usability, and price. The Cape Dory looks like the strongest all-around candidate, while the Chris-Craft is the most distinctive project. Which direction should I research next?',listingIds:boats.map(item=>item.id),options:[{label:'Usable this season',value:'ready-now'},{label:'Best restoration story',value:'restoration'},{label:'Lowest total cost',value:'low-cost'}],requiresHumanResponse:true},'Sample handoff is ready for your response.',{type:'agent',name:'Sample outside agent'});selectSession(opened.sessionId)}finally{setLoadingSample(false)}};
  return <><div className="workbench-hero"><div><p className="eyebrow">Shared with your agent</p><h1>You and your agent</h1><p>Review the shortlists, questions, and recommendations your agent leaves for you. Anything that could contact another person or publish to the marketplace also waits here for your approval.</p></div><div className="workbench-loop"><span><b>1</b>Agent prepares</span><i>→</i><span><b>2</b>You decide</span><i>→</i><span><b>3</b>Work continues</span></div></div><section className="attention-queue"><header><div><small>Needs you</small><h2>{openItems.length+pending.length} items waiting</h2></div><span>Your response becomes the next instruction for your agent.</span></header>{openItems.length===0&&pending.length===0?<div className="attention-empty"><b>Nothing needs you right now</b><p>Your agent can keep researching and organizing safely in the background.</p></div>:<div className="attention-items">{openItems.map(item=><button key={item.id} onClick={()=>selectSession(item.session_id)}><span className="agent-orb">A</span><span><small>{item.kind}</small><b>{item.title}</b></span><em>Respond ›</em></button>)}{pending.map(item=><button key={item.id} onClick={()=>review(item)}><span className="attention-lock">!</span><span><small>Approval required</small><b>{item.summary}</b></span><em>Review ›</em></button>)}</div>}</section><div className="workbench-layout"><aside className="workbench-sessions"><div><h2>Shared work</h2><span>{sessions.length}</span></div>{sessions.map(item=><button className={item.id===session?.id?'active':''} key={item.id} aria-label={`Open shared work ${item.objective}`} onClick={()=>selectSession(item.id)}><i className={item.status}/><span><b>{item.objective}</b><small>{item.agent_name} · {item.status.replaceAll('_',' ')}</small></span></button>)}{sessions.length===0&&<div className="empty"><b>No shared work yet</b><p>Click Bring my agent in the left rail, paste the prompt into your agent, and ask it to research, organize, compare, or monitor finds.</p></div>}</aside><section className="workbench-canvas">{session?<><header><div><small>{session.agent_name} · {session.status.replaceAll('_',' ')}</small><h2>{session.objective}</h2><p>{session.summary}</p></div><a href={`/workbench/${session.id}`}>Open this shared view</a></header><div className="session-context">{session.context?.query&&<span>Query: {session.context.query}</span>}{Object.entries(session.context?.constraints??{}).map(([key,value])=><span key={key}>{key}: {String(value)}</span>)}</div><div className="workbench-thread">{items.map(item=><WorkbenchItem key={item.id} item={item} state={state} act={act}/>)}{items.length===0&&<div className="empty"><b>Your agent is working</b><p>Its next shortlist, question, or recommendation will appear here.</p></div>}</div></>:<section className="workbench-zero"><span className="agent-orb">A</span><h2>A simple place to take turns</h2><p>Your agent can show a shortlist, explain a recommendation, ask one focused question, and wait. Your response becomes durable input for its next step.</p><button className="sample-handoff" disabled={loadingSample} onClick={loadSampleHandoff}>{loadingSample?'Building the example…':'Preview a sample handoff'}</button><small>This creates example shared work so you can see the interaction. No AI runs inside Zingposts.</small></section>}</section></div></>
}

function AlertsView({state,act,setModal}:{state:State;act:any;setModal:(v:ModalType)=>void}){return <><ViewHeader eyebrow="Persistent discovery" title="Marketplace alerts" copy="Store visible, testable monitoring rules. Your outside agent can revisit and check them on a schedule." action="Create alert" onAction={()=>setModal('alert')}/><div className="panel-grid">{state.alerts.map(alert=><article className="data-card" key={alert.id}><div className="data-card-top"><span className={`status-dot ${alert.status}`}/><small>{alert.status}</small><b>{alert.match_count} matches</b></div><h2>{alert.name}</h2><p>{alert.query}</p><div className="criteria">{Object.entries(alert.criteria??{}).map(([key,value])=><span key={key}>{key}: {String(value)}</span>)}</div><button onClick={()=>alert.status==='active'?act('pause_alert',{alertId:alert.id},'Alert paused.'):act('enable_alert',{alertId:alert.id},'Confirmation requested.')}>{alert.status==='active'?'Pause':'Enable'}</button></article>)}</div></>}

function InboxView({state,userMap,act}:{state:State;userMap:Row;act:any}){ const conversations:Row[]=state.conversations.map((c:Row)=>({...c,listing:state.listings.find(l=>l.id===c.listing_id),messages:state.messages.filter(m=>m.conversation_id===c.id),offers:state.offers.filter(o=>o.conversation_id===c.id)})); return <><ViewHeader eyebrow="Human-approved action" title="Messages & offers" copy="Agents can prepare the work. People decide what leaves the workspace."/><div className="conversation-list">{conversations.map((con:Row)=><article className="conversation-card" key={con.id}><img src={con.listing?.image} alt=""/><div className="conversation-main"><div><small>{con.listing?.title}</small><h2>{userMap[con.seller_id]?.name??'Seller'}</h2></div>{con.messages.map((message:Row)=><p className={`bubble ${message.status}`} key={message.id}>{message.body}<small>{message.sender_type} · {message.status}</small>{message.status==='draft'&&<button onClick={()=>act('request_message_send',{messageId:message.id},'Confirmation requested.')}>Request send</button>}</p>)}{con.offers.map((offer:Row)=><div className="offer-row" key={offer.id}><span><small>{offer.status} offer</small><b>{money(offer.amount)}</b><p>{offer.terms}</p></span>{offer.status==='draft'&&<button onClick={()=>act('request_offer_submit',{offerId:offer.id},'Offer is ready for confirmation.')}>Request submit</button>}</div>)}</div></article>)}</div></> }

function TradesView({state,setModal}:{state:State;setModal:(v:ModalType)=>void}){const [risk,setRisk]=useState<Row|null>(null);return <><ViewHeader eyebrow="Multi-party commerce" title="Trade rooms" copy="Keep assets, cash adjustments, people, conditions, and decisions in one shared structure." action="New trade room" onAction={()=>setModal('trade')}/><div className="trade-grid">{state.trades.map(trade=>{const assets=state.assets.filter(a=>a.trade_id===trade.id);return <article className="trade-card" key={trade.id}><div className="trade-head"><span>⇄</span><div><small>{trade.status}</small><h2>{trade.title}</h2></div></div><p>{trade.summary}</p><div className="trade-assets">{assets.map(asset=><div key={asset.id}><img src={state.listings.find(l=>l.id===asset.listing_id)?.image} alt=""/><span><b>{asset.label}</b><small>{asset.owner_name} · {money(asset.value)}</small></span>{asset.cash_adjustment>0&&<em>+{money(asset.cash_adjustment)}</em>}</div>)}</div><div className="trade-footer"><span>{state.participants.filter(p=>p.trade_id===trade.id).length} participants</span><button aria-label={`Review trade risks for ${trade.title}`} onClick={async()=>{const result=await postAction('evaluate_trade_scenarios',{tradeId:trade.id},{type:'human',name:state.user.displayName});setRisk({...result,title:trade.title})}}>Review trade risks</button></div></article>})}</div>{risk&&<div className="modal-backdrop"><section className="modal result-dialog" role="dialog" aria-modal="true" aria-label={`Trade risk review for ${risk.title}`}><button className="modal-close" aria-label="Close trade risk review" onClick={()=>setRisk(null)}>×</button><p className="eyebrow">Deterministic risk review</p><h2>{risk.title}</h2><p className="modal-copy">{risk.assessment}</p><div className="risk-facts"><span><small>Combined scenario value</small><b>{money(risk.totalValue)}</b></span><span><small>Before any invitation</small><b>Verify ownership, condition, transport, and cash adjustment</b></span></div><button className="primary-action" onClick={()=>setRisk(null)}>Done</button></section></div>}</>}

function ActivityView({state,act}:{state:State;act:any}){return <><ViewHeader eyebrow="Trust & control" title="Activity and undo" copy="Every human and agent action remains visible, attributable, and reversible when possible."/><div className="timeline">{state.activities.map(item=><article key={item.id}><span className={`actor ${item.actor_type}`}>{item.actor_type==='agent'?'A':initials(item.actor_name)}</span><div><small>{item.actor_name} · {relative(item.created_at)}</small><p>{item.summary}</p></div>{item.reversible===1&&<button onClick={()=>act('undo_agent_action',{activityId:item.id},'Action undone.')}>Undo</button>}</article>)}</div></>}

function AgentView({state,act,setModal}:{state:State;act:any;setModal:(v:ModalType)=>void}){
  const [copied,setCopied]=useState(false); const skill=`# Zingposts operator\n\n- Open Zingposts in the user's authenticated browser and rediscover its page-scoped WebMCP tools on every visit.\n- If tools are missing, inspect the Zingposts WebMCP panel: browser setup needed means the browser must be updated or configured; browser ready plus no discovered tools means this agent runtime needs WebMCP support or tab permission. Tell the user clearly and do not pretend to be connected.\n- Do not replace unavailable WebMCP tools with DOM automation for marketplace changes.\n- Start with get_webmcp_manifest, get_capability_index, and get_auth_status, then connect_agent, get_site_capabilities, get_workspace_setup_status, and get_human_attention_queue.\n- Use get_capability_group and navigate_to_workspace to open the relevant human-visible workspace, then rediscover the smaller contextual tool set.\n- Treat Zingposts boards, alerts, research, drafts, and activity as durable state.\n- Browse, organize, research, and draft autonomously within the safe lane.\n- Never bypass account verification or human confirmation for publishing, messages, offers, invitations, or payments.\n- For monitoring, reopen Zingposts on schedule; do not assume a tab or WebMCP registration stays alive.`;
  const copySkill=async()=>{if(await writeClipboardText(skill)){setCopied(true);setTimeout(()=>setCopied(false),2000)}};
  const capabilityGroups=[['Views',toolDefinitions.filter(([name])=>['navigate_to_workspace','get_interface_preferences','set_interface_preferences','set_navigation_collapsed','get_marketplace_view','set_marketplace_view'].includes(name))],['Queries',toolDefinitions.filter(([name])=>/^(get_|search_|find_|compare_|refresh_|list_|summarize_|calculate_|evaluate_|preview_)/.test(name)&&!['get_interface_preferences','get_marketplace_view'].includes(name))],['Actions',toolDefinitions.filter(([name])=>/^(set_|save_|unsave_|add_|remove_|rank_|tag_|update_|record_|attach_|pause_|archive_|revoke_|undo_|import_|schedule_)/.test(name)&&!['set_interface_preferences','set_navigation_collapsed','set_marketplace_view'].includes(name))],['Workflows',toolDefinitions.filter(([name])=>/^(connect_|create_|draft_|request_|respond_|enable_|start_|apply_|propose_)/.test(name))]] as const;
  return <><ViewHeader eyebrow="External agent access" title="Your agents, your models" copy="Zingposts has no built-in AI. Outside agents connect immediately for safe work; identity checks wait until something leaves the workspace." action="Add agent profile" onAction={()=>setModal('pair')}/><section className="connection-principle"><div><span className="agent-orb">A</span><p className="eyebrow">Two trust lanes</p><h2>Seamless collaboration inside. Verified action at the marketplace edge.</h2></div><div className="connection-steps"><span><b>1</b><small>Open</small>Agent visits Zingposts</span><span><b>2</b><small>Connect</small>Safe tools activate immediately</span><span><b>3</b><small>Collaborate</small>Browse, organize, research, draft</span><span><b>4</b><small>Verify</small>Human confirms outbound actions</span></div><p>WebMCP registration belongs to the active page, so the agent rediscovers tools on return. Zingposts persists its safe profile, workspace, and audit history. {state.verification.status==='verified'?'This account is verified for publishing and contact.':'Account verification will appear only when publishing or contacting another person is requested.'}</p><button data-testid="copy-agent-skill" onClick={copySkill}>{copied?'Skill starter copied':'Copy reconnect skill starter'}</button></section><div className="agent-layout"><section className="agent-connections"><h2>Connection profiles</h2>{state.agents.map(agent=><article key={agent.id}><span className="agent-orb">A</span><div><b>{agent.name}</b><small>{agent.status} · safe workspace · {(agent.scopes??[]).length} scopes</small><div className="scope-row">{(agent.scopes??[]).map((scope:string)=><span key={scope}>{scope}</span>)}</div></div>{agent.status==='pending'?<button data-testid={`approve-${agent.id}`} onClick={()=>act('approve_agent_pairing',{agentId:agent.id},'Additional scopes approved.')}>Review extra scopes</button>:agent.status==='active'?<button onClick={()=>act('revoke_agent',{agentId:agent.id},'Agent access revoked.')}>Revoke</button>:null}</article>)}{!state.agents.length&&<div className="empty"><b>No agent profiles yet</b><p>Your external agent can call <code>connect_agent</code> from this authenticated page and start safe work immediately.</p></div>}</section><section className="tool-catalog"><h2>WebMCP map <span>{toolDefinitions.length}</span></h2><p className="catalog-intro"><code>get_webmcp_manifest</code> gives an outside agent this grouped map plus recommended entry points and workflows.</p>{capabilityGroups.map(([label,tools])=><section className="tool-group" key={label}><h3>{label}<span>{tools.length}</span></h3>{tools.map(([name,description])=><details key={name}><summary><code>{name}</code><span>›</span></summary><p>{description}</p></details>)}</section>)}</section></div></>}

function ConfirmationDock({confirmation,review,dismiss}:{confirmation:Row;review:()=>void;dismiss:()=>void}){ return <section className="confirmation-dock" role="alert"><span className="confirm-icon">!</span><div><small>Human review required</small><b>{confirmation.summary}</b></div><button className="confirmation-dismiss" onClick={dismiss}>Not now</button><button data-testid="review-agent-action" onClick={review}>Review exact action</button></section> }

function ApprovalReview({confirmation,state,act,close}:{confirmation:Row;state:State;act:any;close:()=>void}){
  const request=confirmation.payload?._request??{}; const payload=Object.fromEntries(Object.entries(confirmation.payload??{}).filter(([key])=>key!=='_request'&&key!=='confirmed')); const message=payload.messageId?state.messages.find(item=>item.id===payload.messageId):null; const offer=payload.offerId?state.offers.find(item=>item.id===payload.offerId):null; const listingId=message?state.conversations.find(item=>item.id===message.conversation_id)?.listing_id:offer?.listing_id??payload.listingId; const listing=state.listings.find(item=>item.id===listingId); const seller=listing?state.users.find(item=>item.id===listing.owner_id):null;
  const approve=async()=>{await act(confirmation.action,{...payload,confirmed:true},'Approved once and completed.',{type:'human',name:state.user.displayName});close()};
  return <div className="modal-backdrop"><section className="approval-review" role="dialog" aria-modal="true" aria-label={`Review ${confirmation.action.replaceAll('_',' ')}`}><header><span className="confirm-icon">!</span><div><small>Approve once · expires in 24 hours</small><h2>Review the exact marketplace action</h2></div><button aria-label="Close action review" onClick={close}>×</button></header><div className="approval-grid"><section><small>Proposed action</small><b>{confirmation.action.replaceAll('_',' ')}</b></section><section><small>Prepared by</small><b>{request.actorName??'Connected agent'}</b><span>{request.actorType??'agent'} through Zingposts</span></section><section><small>Recipient or record</small><b>{seller?.name??listing?.title??'Zingposts workspace record'}</b><span>{listing?.title??confirmation.id}</span></section><section><small>Why review is required</small><b>This action leaves the private workspace</b><span>Nothing happens until you approve this single payload.</span></section></div>{message&&<section className="approval-payload"><small>Message that will be sent</small><blockquote>{message.body}</blockquote></section>}{offer&&<section className="approval-payload"><small>Offer that will be submitted</small><strong>{money(offer.amount)}</strong><p>{offer.terms}</p></section>}<section className="approval-payload raw"><small>Structured action details</small><pre>{JSON.stringify(payload,null,2)}</pre></section><footer><button onClick={async()=>{await act('dismiss_confirmation',{confirmationId:confirmation.id},'Request declined.');close()}}>Decline</button><button className="primary-action" data-testid="confirm-agent-action" onClick={approve}>Approve this action once</button></footer><p className="approval-note">Agent identity, payload, decision, and outcome remain in Activity & undo. Similar future actions still require their own review.</p></section></div>
}

function VerificationDock({confirmation,dismiss,verify}:{confirmation:Row;dismiss:()=>void;verify:()=>void}){return <section className="confirmation-dock verification-dock" role="alert"><span className="confirm-icon">✓</span><div><small>Verify at the marketplace boundary</small><b>{confirmation.summary} Verify the account before reviewing this action.</b></div><button className="confirmation-dismiss" onClick={dismiss}>Not now</button><button data-testid="verify-for-action" onClick={verify}>Verify account</button></section>}

function AccountVerificationModal({
  state,
  close,
}: {
  state: State;
  close: () => void;
}) {
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState(state.user.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "upgrade",
          email,
          name: state.user.displayName,
        }),
      });
      const body = (await response.json()) as { error?: string; code?: string };
      if (!response.ok)
        throw new Error(
          body.error ?? "Unable to send the secure verification link.",
        );
      setStep("sent");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to verify this account.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal sign-in-modal verification-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Verify your Zingposts workspace"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Close account verification"
          onClick={close}
        >
          ×
        </button>
        <p className="eyebrow">Marketplace boundary</p>
        <h2>{step === "email" ? "Verify a real email" : "Check your email"}</h2>
        <p className="modal-copy">
          {step === "email"
            ? "Replace the prototype email if needed. This becomes the durable login for this workspace before anything reaches another marketplace participant."
            : `We sent a secure verification link to ${email}. Open it to return here and verify the workspace automatically.`}
        </p>
        {step === "sent" ? (
          <section className="email-link-sent" role="status">
            <span>✉</span>
            <div>
              <b>Open the link in your email</b>
              <p>
                No code is required. Supabase will verify the address and
                reconnect this workspace.
              </p>
            </div>
            <button
              className="primary-action"
              onClick={() => window.location.reload()}
            >
              I opened the link — check again
            </button>
            <button
              className="secondary-action"
              onClick={() => {
                setStep("email");
                setError("");
              }}
            >
              Use a different email or resend
            </button>
          </section>
        ) : (
          <form onSubmit={submit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                <b>{error}</b>
                {/hourly window/i.test(error) && (
                  <span>
                    Supabase’s built-in test mailer allows only two messages per
                    hour. An older link may still work; otherwise wait and try
                    once more.
                  </span>
                )}
              </div>
            )}
            <button
              data-testid="verification-submit"
              className="primary-action"
              disabled={busy || !email.includes("@")}
            >
              {busy ? "Working…" : "Email me a secure verification link"}
            </button>
          </form>
        )}
        <div className="sign-in-trust">
          <span>✓</span>
          <p>
            <b>Supabase authentication begins here.</b> After verification, this
            browser and the user’s outside agent must each authenticate
            separately. The agent never receives the human session.
          </p>
        </div>
      </section>
    </div>
  );
}

function ViewHeader({
  eyebrow,
  title,
  copy,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="market-header page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action && (
        <button className="sell-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function Modal({type,close,state,listing,act,onDone}:{type:Exclude<ModalType,null|'verify'>;close:()=>void;state:State;listing?:Row;act:any;onDone:()=>void}){ const [submitting,setSubmitting]=useState(false); const [formError,setFormError]=useState(''); const [alertPreview,setAlertPreview]=useState<Row|null>(null); const [agentInvite,setAgentInvite]=useState<Row|null>(null); const formRef=useRef<HTMLFormElement|null>(null); const previewAlert=async()=>{if(!formRef.current)return;setSubmitting(true);setFormError('');try{const data=Object.fromEntries(new FormData(formRef.current));const result=await postAction('interpret_alert',{query:data.query,criteria:{maxPrice:Number(data.maxPrice)||undefined,beforeYear:Number(data.beforeYear)||undefined}},{type:'human',name:state.user.displayName});setAlertPreview(result)}catch(error){setFormError(error instanceof Error?error.message:'Unable to preview this alert.')}finally{setSubmitting(false)}}; const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setSubmitting(true);setFormError('');try{const formData=new FormData(e.currentTarget);let image='/images/draft.jpg';const photo=formData.get('photo');if(photo instanceof File&&photo.size){const upload=new FormData();upload.set('file',photo);const response=await fetch('/api/uploads',{method:'POST',body:upload});const body=await response.json() as {url?:string;error?:string};if(!response.ok||!body.url)throw new Error(body.error??'Photo upload failed');image=body.url;}formData.delete('photo');const data=Object.fromEntries(formData); if(type==='listing') await act('create_listing_draft',{...data,image,year:Number(data.year),price:Number(data.price)},'Listing draft created.'); if(type==='track') await act('import_listing_url',{...data,price:Number(data.price)},'Outside listing is now tracked.'); if(type==='board') await act('create_board',data,'Board created.'); if(type==='alert') await act('create_alert_draft',{name:data.name,query:data.query,criteria:{maxPrice:Number(data.maxPrice)||undefined,beforeYear:Number(data.beforeYear)||undefined}},'Alert draft created.'); if(type==='research') await act('add_research_note',{listingId:listing?.id,title:data.title,body:data.body,confidence:data.confidence,sources:data.source?[{label:'Research source',url:data.source}]:[]},'Research note added.'); if(type==='comparable') await act('record_price_comparable',{listingId:listing?.id,title:data.title,soldPrice:Number(data.soldPrice),soldDate:data.soldDate,location:data.location,condition:data.condition,sourceUrl:data.sourceUrl,sourceLabel:data.sourceLabel,notes:data.notes,confidence:data.confidence},'Price comparable recorded.'); if(type==='plan') await act('create_negotiation_plan',{listingId:listing?.id,targetOffer:Number(data.targetOffer),ceiling:Number(data.ceiling),strategy:data.strategy,contingencies:String(data.contingencies??'').split('\n').map(value=>value.trim()).filter(Boolean)},'Private offer plan saved.'); if(type==='message') await act('draft_seller_message',{listingId:listing?.id,body:data.body},'Message draft prepared.'); if(type==='offer'){const con=state.conversations.find(c=>c.listing_id===listing?.id);await act('create_offer_draft',{listingId:listing?.id,conversationId:con?.id??'',amount:Number(data.amount),terms:data.terms},'Offer draft prepared.')} if(type==='trade') await act('create_trade_room',{title:data.title,summary:data.summary,participants:[{name:state.user.displayName,email:state.user.email,role:'proposer'},{name:'Counterparty',role:'counterparty'}],assets:listing?[{listingId:listing.id,ownerName:userName(state,listing.owner_id),label:listing.title,value:listing.price,cashAdjustment:Number(data.cashAdjustment)||0,conditions:['Inspection required']}]:[]},'Trade room created.'); if(type==='pair'&&state.verification.status==='verified'){const invite=await act('create_agent_auth_code',{name:data.name},'One-time agent code created.',{type:'human',name:state.user.displayName});setAgentInvite(invite);return;} if(type==='pair') await act('connect_agent',{name:data.name},'Agent connected for prototype workspace work.',{type:'human',name:state.user.displayName}); onDone();}catch(error){setFormError(error instanceof Error?error.message:'Action failed.')}finally{setSubmitting(false)} };
const configs:Record<string,{title:string;copy:string;fields:Array<[string,string,string,string?]>}>={listing:{title:'Create a native listing',copy:'Start with the facts you know. You or a connected external agent can complete the record later.',fields:[['photo','Listing photo','file'],['title','Title','text','1976 Mako 20 center console'],['year','Year','number','1976'],['make','Make','text','Mako'],['model','Model','text','20'],['category','Category','select'],['price','Asking price','number','12500'],['location','Location','text','Richmond, VA'],['condition','Condition','select'],['description','Description','textarea','Tell buyers what makes it special…']]},track:{title:'Track an outside find',copy:'Zingposts will preserve the source and treat its details as unverified.',fields:[['url','Source URL','url','https://…'],['title','Listing title','text','1979 Toyota FJ40'],['price','Current price','number','31500'],['location','Location','text','Knoxville, TN'],['category','Category','select']]},board:{title:'Create a board',copy:'Boards can be reorganized by you or a scoped external agent.',fields:[['name','Board name','text','Worth a drive'],['description','Description','textarea','Strong candidates for an in-person inspection'],['color','Color','color','#b55232']]},alert:{title:'Create an alert',copy:'Start in natural language, preview the current matches, then enable it.',fields:[['name','Alert name','text','Vintage 4×4s under $25k'],['query','What are you looking for?','textarea','Pre-1990 four wheel drives in good condition'],['maxPrice','Maximum price','number','25000'],['beforeYear','Built before','number','1990']]},research:{title:'Add listing research',copy:listing?.title??'',fields:[['title','Research title','text','Known issues and inspection points'],['body','Findings','textarea','Record what you found and what still needs verification…'],['source','Source URL','url','https://…'],['confidence','Confidence','select']]},comparable:{title:'Record a sold comparable',copy:'Add evidence the person and their outside agent can inspect and reuse in transparent price calculations.',fields:[['title','Comparable item','text',listing?.title??'Similar make and model'],['soldPrice','Sold price','number',String(listing?.price??10000)],['soldDate','Sale date','date'],['location','Location','text',listing?.location??''],['condition','Condition','select'],['sourceUrl','Source URL','url','https://…'],['sourceLabel','Source label','text','Auction result or marketplace archive'],['notes','Why it is comparable','textarea','Note condition, options, documentation, and important differences…'],['confidence','Confidence','select']]},plan:{title:'Create a private offer plan',copy:'This is a reviewable workspace plan. It does not contact the seller or submit an offer.',fields:[['targetOffer','Target opening offer','number',String(Math.round((listing?.price??10000)*.9))],['ceiling','Walk-away ceiling','number',String(listing?.price??10000)],['strategy','Strategy','textarea','Lead with condition evidence and confirm ownership before discussing price.'],['contingencies','Contingencies, one per line','textarea','Satisfactory inspection\nClear ownership documents\nTransport cost confirmed']]},message:{title:'Draft a seller message',copy:'Nothing will be sent until you confirm it.',fields:[['body','Message','textarea',`Hi — I’m interested in the ${listing?.title??'listing'}. Could you tell me more about its history and anything not covered in the listing?`]]},offer:{title:'Prepare an offer',copy:'Zingposts will keep this as a private draft.',fields:[['amount','Offer amount','number',String(Math.round((listing?.price??10000)*.92))],['terms','Terms and contingencies','textarea','Subject to a satisfactory inspection and clear ownership documents.']]},trade:{title:'Create a trade room',copy:'Structure people, assets, cash adjustments, and conditions.',fields:[['title','Trade room title','text',listing?`${listing.title} trade proposal`:'Weekend project trade'],['summary','Summary','textarea','Explore a fair trade with clear inspection conditions.'],['cashAdjustment','Cash adjustment','number','0']]},pair:{title:'Create an agent connection invite',copy:'This creates a pending, revocable profile. Your outside agent still connects through the browser’s WebMCP surface and never receives your password.',fields:[['name','Agent name','text','My local agent']]}};
configs.pair={title:'Add an agent profile',copy:'The profile becomes active immediately for safe workspace work. Publishing and outbound commerce remain protected.',fields:[['name','Agent name','text','My local agent']]};
  const config=configs[type]; if(agentInvite)return <div className="modal-backdrop" onMouseDown={close}><section className="modal agent-code-modal" role="dialog" aria-modal="true" aria-label="Agent authentication code" onMouseDown={event=>event.stopPropagation()}><button className="modal-close" aria-label="Close agent code" onClick={close}>×</button><p className="eyebrow">Agent authentication</p><h2>Give this code to your agent</h2><p className="modal-copy">It works once, expires in 10 minutes, and creates a separate revocable session. It is not your Supabase login.</p><code>{agentInvite.code}</code><button className="primary-action" onClick={async()=>{const prompt=`${createAgentInvitePrompt(window.location.origin,{checked:false,supported:false,surfaces:[],availableTools:0,registeredToolNames:[],failedToolNames:[]})}\n\nOne-time Zingposts agent authentication\nCode: ${agentInvite.code}\nExpires: ${agentInvite.expiresAt}\nCall authenticate_agent with this code immediately, then discard it.`;await writeClipboardText(prompt)}}>Copy agent prompt with code</button><small>Close this window after the agent exchanges the code. A new code is required if it expires or is used.</small></section></div>; return <div className="modal-backdrop" onMouseDown={close}><section className="modal" role="dialog" aria-modal="true" aria-label={config.title} onMouseDown={e=>e.stopPropagation()}><button className="modal-close" aria-label={`Close ${config.title}`} onClick={close}>×</button><p className="eyebrow">Zingposts</p><h2>{config.title}</h2><p className="modal-copy">{config.copy}</p><form ref={formRef} onSubmit={submit}>{config.fields.map(([name,label,kind,placeholder])=><label key={name}>{label}{kind==='textarea'?<textarea name={name} placeholder={placeholder} required={['description','body','query','strategy'].includes(name)}/>:kind==='select'?<select name={name}>{name==='category'?['Cars & trucks','Boats','Campers','Machinery','Motorcycles','Other'].map(v=><option key={v}>{v}</option>):name==='condition'?['Excellent','Very good','Good','Working','Project','Unknown'].map(v=><option key={v}>{v}</option>):['high','medium','low'].map(v=><option key={v}>{v}</option>)}</select>:<input name={name} type={kind} accept={kind==='file'?'image/*':undefined} placeholder={placeholder} defaultValue={kind==='color'?placeholder:undefined} required={!['photo','make','model','source','sourceUrl','sourceLabel','soldDate','location','cashAdjustment'].includes(name)}/>}</label>)}{type==='alert'&&<><button className="preview-action" type="button" disabled={submitting} onClick={previewAlert}>{submitting?'Interpreting…':'Preview interpretation & matches'}</button>{alertPreview&&<section className="alert-interpretation" role="status"><small>Interpreted as</small><div>{(alertPreview.interpretation?.plainLanguage??[]).map((line:string)=><span key={line}>{line}</span>)}</div><b>{alertPreview.previewCount} current matches</b><p>{(alertPreview.matches??[]).slice(0,3).map((item:Row)=>item.title).join(' · ')||'No current matches. Adjust the wording or filters.'}</p></section>}</>}{formError&&<p className="form-error" role="alert">{formError}</p>}<button className="primary-action" type="submit" disabled={submitting}>{submitting?'Working…':type==='pair'?(state.verification.status==='verified'?'Create agent code':'Connect agent'):type==='message'?'Save draft':type==='offer'?'Prepare offer':type==='comparable'?'Save comparable':type==='plan'?'Save private plan':type==='alert'?'Save reviewed alert':'Continue'}</button></form></section></div> }

const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value||0); const initials=(name:string='')=>name.split(/\s+/).map(v=>v[0]).join('').slice(0,2).toUpperCase(); const relative=(date:string)=>{const mins=Math.max(0,Math.round((Date.now()-new Date(date).getTime())/60000));return mins<2?'just now':mins<60?`${mins}m ago`:mins<1440?`${Math.round(mins/60)}h ago`:`${Math.round(mins/1440)}d ago`}; const userName=(state:State,id:string)=>state.users.find(u=>u.id===id)?.name??'Owner';
