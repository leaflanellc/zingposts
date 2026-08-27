# Zingposts

**Interesting things, organized together.**

Zingposts is a WebMCP-ready peer-to-peer marketplace for old cars, boats, campers, motorcycles, machinery, and other interesting things. The marketplace owns its native listings and deal workflows; users can also track outside listings as clearly labeled, non-authoritative snapshots.

Zingposts contains no LLM and no built-in agent. It provides deterministic marketplace functionality and durable shared state. The user chooses an outside agent, which discovers and invokes the page’s WebMCP tools.

![Zingposts social preview](public/og.png)

## Why WebMCP

Marketplace search is usually a pile of filters. The harder work happens afterward: keeping candidates organized, researching condition and provenance, watching price changes, following up, negotiating, and sometimes structuring a multi-party trade.

Zingposts exposes that durable marketplace workspace as 110 structured WebMCP tools through a compact persistent core and one navigation-independent focused capability pack. A user can point a local agent at the site and ask it to:

- search native inventory and track outside finds;
- organize listings into flexible boards, tags, statuses, and rankings;
- build cited research notebooks, inspection checklists, comparables, and risk logs;
- record structured sold comparables, calculate transparent price and all-in-cost ranges, and save a private offer strategy;
- draft alerts, seller messages, negotiation plans, offers, and trade scenarios;
- exchange a user-issued, single-use code for a separate expiring and revocable session instead of receiving the user's login;
- leave consequential actions—publication, notifications, messages, offers, and invitations—at an explicit human-confirmation gate;
- make every action attributable and undo reversible work.
- open a durable collaboration session, place a shortlist or focused question on the shared canvas, read the person’s response, and continue from it.

The same state remains legible and editable in the human interface. Reasoning stays in the outside agent; Zingposts is the shared workspace and action surface.

## Product tour

- Native marketplace with 12 seeded listings and original project-owned imagery
- Buyer and seller workspaces
- Listing photo uploads backed by private Supabase Storage
- Agent image ingestion from permitted public HTTPS sources, copied into private Supabase Storage with attribution and alt text; unpublished drafts update seamlessly while live-listing media changes wait for verified human approval
- External-listing tracking with source-authority warnings
- Boards, saved items, alerts, research, messages, offers, and multi-party trade rooms
- A canvas-first marketplace whose collapsible left rail contains search, listing actions, filters, view modes, navigation, and persistent board drop targets
- Drag-to-board organization for people, with a click-to-board fallback for touch and accessibility, plus equivalent structured board actions for agents
- Person-first and agent-first onboarding with replayable local sign-out
- A single **Bring my agent** button that copies the canonical public guide URL—or, on verified workspaces, an opaque single-use invite URL whose fragment is erased immediately after exchange
- A public human-readable `/for-agents` guide plus machine-readable `/api/agent-guide`, including WebMCP preflight, bootstrap, capability activation, reconnect, collaboration, and safety guidance
- A small **WebMCP tools** guide that reports live browser readiness, the focused capability pack, the person’s visible page, and other available packs without claiming navigation unlocks business tools
- Supabase email-code authentication for verified people, with an editable email when a prototype workspace crosses the marketplace boundary
- Separate 10-minute, single-use opaque invite URLs (with code fallback) and 12-hour revocable agent sessions for verified workspaces
- Scoped, revocable agent profiles and preferences
- 110 declarative WebMCP tools in the complete catalog, with a compact persistent core and one replaceable focused capability pack
- One-call resume through `get_agent_bootstrap`, progressive discovery through `get_capability_index` and `get_capability_group`, navigation-independent `activate_capability`, and optional `open_for_human_review`
- Immediate prototype-lane agent connection for discovery, organization, research, alerts, and drafts
- A real verification boundary: Supabase authentication plus exact human confirmation before publishing or contacting marketplace participants
- Eighteen public tools available before human sign-in for bootstrap, discovery, authentication, interpreted alerts, public search, and agent-first handoff
- A human-facing **Shared with agent** area for durable shortlists, recommendations, questions, human responses, and resumable work sessions
- Canonical server-derived agent identity, live activity, structured WebMCP error results, strict workflow enums, idempotent mutations, version-conflict protection, exact-action review, and stable deep links
- Isolated QA namespaces with exact artifact preview and human-approved cleanup
- Durable interface preferences, including a collapsible navigation rail, full-screen sequential listing review, and agent-controllable marketplace canvas modes
- Resumable workspace inventory tools for owned drafts, boards, saved items, alerts, research notebooks, collaboration sessions, conversations, and trade rooms
- Required-field JSON schemas and `untrustedContentHint` annotations for tools that return marketplace or user-authored content
- Private draft, board, trade-room, conversation, and tag data scoped to the signed-in workspace rather than leaking through shared marketplace records
- Human confirmation tray for consequential actions
- Attributed activity ledger and undo
- Responsive desktop and mobile experience

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Create `.env.local` from `.env.example`, then open [http://localhost:3000](http://localhost:3000). The local preview starts with a test user; use the account menu to log out and replay either onboarding path. All durable marketplace state and listing uploads use the configured Supabase project.

## Verify

With the development server running:

```bash
npm run test:types
npm run lint
npm run test:smoke
npm run build -- --webpack
```

With Supabase test credentials in the environment, `npm run test:human-auth` verifies that the legacy prototype cookie stops working after account upgrade and that a real Supabase session resumes the workspace. `npm run test:agent-auth` verifies single-use code and invite exchange, canonical server-derived identity and profile reuse, bootstrap, private workspace access, non-bypassable human approval, and immediate revocation.

The smoke test uses its own workspace and QA namespace. It checks bootstrap, exact manifest coverage, capability activation without navigation, the Virginia sailboat alert regression, field-aware truck relevance, strict state enums, structured missing-record errors, optimistic concurrency, a human-agent response loop, consequential-action gates, and exact namespaced cleanup without executing marketplace commitments.

## WebMCP implementation

The browser registration lives in `app/scoutboard-client.tsx`. Each capability has a distinct name, description, JSON input schema, safety annotation, and executor. Registration uses AbortSignal-managed lifetimes: the persistent core stays stable and capability activation replaces the focused pack instead of accumulating route catalogs. Tool execution dispatches to the same durable action layer used by the human UI and returns WebMCP-native structured success or error results.

The bottom-right guide inspects the active tab rather than assuming WebMCP is configured. It reports whether a usable `modelContext` surface is present, counts successfully registered tools, and shows setup guidance when the browser API is unavailable. The guide is visible before sign-in as well as inside the workspace, and labels tools as ready, login-locked, read-only, state-changing, or separately approval-gated. It deliberately does not claim that an outside agent is connected: a web page can verify its browser registration surface, while agent access to the tab remains the responsibility of the user-selected agent runtime.

`get_agent_bootstrap` returns authentication, canonical identity, workspace overview, attention, active collaboration, capabilities, and guide version in one call. `get_webmcp_manifest` lists every tool exactly once. `activate_capability` replaces the focused tool pack without navigating; `open_for_human_review` is optional. `get_marketplace_view` and `set_marketplace_view` coordinate the same gallery, focus, or thumbnail canvas the person sees. People can drag any canvas item onto a board in the left rail; `add_listings_to_board` is the agent’s deterministic equivalent.

For selling, `list_my_listings` exposes unpublished drafts and `attach_listing_image_from_url` safely imports a user-permitted public image into the listing-media bucket, preserving source, attribution, accessible alt text, and an undo record. Owned drafts update immediately; the same tool converts a live-listing media change into an exact verification and one-time human-approval request so an agent cannot silently alter the public presentation.

The collaboration group is the showcase loop: `start_collaboration_session` opens shared work, `add_collaboration_item` places a structured shortlist, question, recommendation, decision, or note on the canvas, `respond_to_collaboration_item` records human guidance, and `get_collaboration_session` lets the outside agent resume with that guidance. `get_human_attention_queue` keeps ordinary collaboration questions and consequential marketplace actions visible in one place. A clearly labeled sample handoff lets a judge experience the same durable records without pretending Zingposts contains a model.

The action layer in `lib/scoutboard-store.ts` enforces ownership, derives actor identity on the server, records attribution, and turns consequential requests into pending confirmation records. A prototype workspace can be upgraded only by opening the secure Supabase link sent to the real email address. From then on, deterministic-email and legacy-cookie access are disabled. The human returns through Supabase; the agent authenticates separately through `authenticate_agent` with a code the verified human created through `create_agent_auth_code`.

WebMCP registration belongs to the application document rather than a permanent network connection. The document keeps a stable core and swaps focused capability packs independently of route navigation. Zingposts persists agent profiles, scopes, preferences, workspace objects, verified identity, versions, and audit history. Anonymous agents receive public discovery plus a prototype handoff. Verified private work requires the agent’s own expiring session; revoking an agent immediately revokes its sessions. Publishing listings, sending messages, submitting or responding to offers, enabling notifications, and inviting trade participants still require separate exact human confirmation.

For the person-first path, the left rail has one **Bring my agent** button. A prototype workspace copies `/for-agents`; a verified workspace copies a one-use invite URL. Its opaque credential is carried only in the URL fragment, exchanged once, and removed from browser history immediately. The public guide tells the agent how to detect missing browser or runtime support and begin with `get_agent_bootstrap`. For the agent-first path, the agent can call `connect_agent` publicly and open the returned handoff for the person. Technical tool maps remain at `/agents`; the canonical operational guide is `/for-agents` with JSON at `/api/agent-guide`.

## Architecture

- Next.js / React 19
- Supabase Auth for verified human sessions
- Supabase Postgres for marketplace, identity mapping, agent sessions, and workflow state
- Supabase Storage for listing photos
- Netlify Functions and the Next.js runtime
- Versioned Supabase SQL migrations for marketplace, verified identity, one-time code, and agent-session tables
- Declarative WebMCP registration with public and authenticated tool catalogs

## Deployment

Pushes to `main` run the GitHub verification workflow and trigger the connected Netlify production pipeline. Netlify holds the Supabase server credentials and session-signing secret; none are committed to the repository. The production domain is `https://zingposts.com`.

## License

[MIT](LICENSE)
