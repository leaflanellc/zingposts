# Zingposts

**Interesting things, organized together.**

Zingposts is a WebMCP-ready peer-to-peer marketplace for old cars, boats, campers, motorcycles, machinery, and other interesting things. The marketplace owns its native listings and deal workflows; users can also track outside listings as clearly labeled, non-authoritative snapshots.

Zingposts contains no LLM and no built-in agent. It provides deterministic marketplace functionality and durable shared state. The user chooses an outside agent, which discovers and invokes the page’s WebMCP tools.

![Zingposts social preview](public/og.png)

## Why WebMCP

Marketplace search is usually a pile of filters. The harder work happens afterward: keeping candidates organized, researching condition and provenance, watching price changes, following up, negotiating, and sometimes structuring a multi-party trade.

Zingposts exposes that durable marketplace workspace as 85 structured WebMCP tools. A user can point a local agent at the site and ask it to:

- search native inventory and track outside finds;
- organize listings into flexible boards, tags, statuses, and rankings;
- build cited research notebooks, inspection checklists, comparables, and risk logs;
- draft alerts, seller messages, negotiation plans, offers, and trade scenarios;
- pair with revocable scopes instead of receiving the user's password;
- leave consequential actions—publication, notifications, messages, offers, and invitations—at an explicit human-confirmation gate;
- make every action attributable and undo reversible work.
- open a durable collaboration session, place a shortlist or focused question on the shared canvas, read the person’s response, and continue from it.

The same state remains legible and editable in the human interface. Reasoning stays in the outside agent; Zingposts is the shared workspace and action surface.

## Product tour

- Native marketplace with 12 seeded listings and original project-owned imagery
- Buyer and seller workspaces
- Listing photo uploads backed by private Supabase Storage
- External-listing tracking with source-authority warnings
- Boards, saved items, alerts, research, messages, offers, and multi-party trade rooms
- A canvas-first marketplace whose collapsible left rail contains search, listing actions, filters, view modes, navigation, and persistent board drop targets
- Drag-to-board organization for people, with a click-to-board fallback for touch and accessibility, plus equivalent structured board actions for agents
- Person-first and agent-first onboarding with replayable local sign-out
- Scoped, revocable agent profiles and preferences
- 85 declarative WebMCP tools registered on `document.modelContext` and `navigator.modelContext`
- Immediate safe-lane agent connection for discovery, organization, research, alerts, and drafts
- Deferred account verification plus human confirmation before publishing or contacting marketplace participants
- Eleven public tools available before sign-in for discovery, the grouped WebMCP manifest, interpreted alerts, public search, and agent-first handoff
- A shared Agent Workbench for durable agent shortlists, recommendations, questions, human responses, and resumable work sessions
- Live WebMCP activity pulses, structured errors, idempotent mutations, dry runs, exact-payload review, and stable deep links
- Durable interface preferences, including a collapsible navigation rail, full-screen sequential listing review, and agent-controllable marketplace canvas modes
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
npm run build
```

The smoke test checks seeded persistence, authentication status, the WebMCP catalog, category-aware search, interpreted alerts, idempotency, dry runs, agent-created organization, a full agent-question/human-response loop, verification and confirmation gates, interface preferences, the activity ledger, deep links, and undo. The onboarding tests additionally exercise anonymous public connection, automatic agent-first handoff attachment, and immediate person-first connection.

## WebMCP implementation

The browser registration lives in `app/scoutboard-client.tsx`. Each capability has a distinct name, description, JSON input schema, safety annotation, and executor. An authenticated page exposes the full catalog; a signed-out page exposes eleven public discovery and onboarding tools. Tool execution dispatches to the same durable action layer used by the human UI.

`get_webmcp_manifest` organizes the catalog into views, queries, actions, and workflows. `get_marketplace_view` and `set_marketplace_view` let a scoped outside agent coordinate the same gallery, focus, or thumbnail canvas the person sees. People can drag a gallery card, focus image, or thumbnail directly onto a board in the left rail; `add_listings_to_board` is the agent’s deterministic equivalent.

The collaboration group is the showcase loop: `start_collaboration_session` opens shared work, `add_collaboration_item` places a structured shortlist, question, recommendation, decision, or note on the canvas, `respond_to_collaboration_item` records human guidance, and `get_collaboration_session` lets the outside agent resume with that guidance. `get_human_attention_queue` keeps ordinary collaboration questions and consequential marketplace actions visible in one place. A clearly labeled sample handoff lets a judge experience the same durable records without pretending Zingposts contains a model.

The action layer in `lib/scoutboard-store.ts` enforces ownership, records attribution, and turns consequential agent requests into pending confirmation records. The site never gives an agent a user's password. Pairing grants visible, revocable scopes.

WebMCP registration is page-scoped rather than a permanent connection. Zingposts persists the safe agent profile, scopes, preferences, workspace objects, verification state, and audit history. `connect_agent` works without an approval pause: anonymous agents receive public discovery plus a handoff, while agents in an authenticated browser receive safe workspace access immediately. Publishing listings, sending messages, submitting or responding to offers, and inviting trade participants require verified account state and a separate human confirmation. A copyable skill starter tells outside agents to reopen the site, rediscover tools, verify authentication, and resume from Zingposts’ durable records. Scheduled monitoring should likewise reopen the page rather than assume a tab remains connected.

## Architecture

- Next.js / React 19
- Supabase Postgres for marketplace and workflow state
- Supabase Storage for listing photos
- Netlify Functions and the Next.js runtime
- Versioned Supabase SQL migrations for 21 tables
- Declarative WebMCP registration with public and authenticated tool catalogs

## Deployment

Pushes to `main` run the GitHub verification workflow and trigger the connected Netlify production pipeline. Netlify holds the Supabase server credentials and session-signing secret; none are committed to the repository. The production domain is `https://zingposts.com`.

## License

[MIT](LICENSE)
