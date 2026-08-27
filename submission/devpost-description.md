# Zingposts — Devpost submission draft

## Tagline

Interesting things, organized together: a WebMCP-ready marketplace where people work with the outside agents they already trust.

## Inspiration

Browsing old cars, boats, campers, motorcycles, and machinery is fun. Managing the hunt is not. Good finds get lost across tabs, marketplace search misses obvious matches, alerts are rigid, research lives in scattered notes, and negotiations have no shared memory. A three-way trade is almost impossible to reason about cleanly.

Zingposts starts from a different premise: the marketplace should be equally legible to people and their agents without embedding a model in the product. The site owns its native listings and structured deal workflow, while outside listings can be tracked as clearly labeled snapshots.

## What it does

Zingposts is a complete peer-to-peer marketplace and durable workspace for interesting things.

People can browse realistic native inventory, create and publish listings, upload photos, save finds, build boards, set alerts, keep research notebooks, message sellers, prepare offers, and create structured multi-party trade rooms. Outside finds can be tracked without confusing them with Zingposts-owned inventory.

A connected outside agent receives a compact persistent core plus one focused pack drawn from 110 structured WebMCP tools. It can search with compound criteria, compare candidates, organize boards, tag and rank finds, record cited research and inspection risks, monitor price changes, draft communications and offers, calculate acquisition cost, propose trade scenarios, and coordinate the shared gallery, focus, or thumbnail canvas. The human uses the same structure through a canvas-first interface. Zingposts itself contains no LLM.

The centerpiece is the shared canvas: an outside agent opens a durable session, places a shortlist, recommendation, or focused question beside the marketplace objects, and pauses only when human judgment matters. The person can inspect the exact listings and rationale, choose an option or add context, and return structured guidance. The agent reads that durable response on its next tool call and continues. This is turn-taking over shared marketplace objects, not a chatbot transcript.

Either side can arrive first. A person can explore immediately in a prototype workspace, then replace a test email and verify the real address through Supabase only when work reaches the marketplace boundary. One **Bring my agent** click copies the canonical guide URL. Or an unauthenticated agent can inspect five setup-only tools and open a prototype handoff for the person. Once the person signs in, safe private tools appear automatically to an outside agent operating that browser document. Independent 12-hour revocable sessions remain available through one-use invites or codes for separate-browser or unattended work.

The human remains in control. Publishing, enabling notifications, sending a message, submitting or responding to an offer, and inviting a trade participant stop at a visible confirmation gate. Every human and agent action is attributed, and reversible work can be undone.

## Why WebMCP is essential

Without WebMCP, an agent has to infer intent from buttons and screen position. That is brittle for a marketplace with dozens of interdependent objects: listings, boards, research, alerts, conversations, offers, people, assets, and constraints.

WebMCP gives Zingposts a stable collaboration language. “Find pre-1980 boats under $15,000, put the best four on a board, record the title risks, and draft a message to the strongest seller” becomes a sequence of typed, attributable actions. The human can watch the same state change, refine it directly, and approve the parts that cross a consequential boundary.

That makes the product meaningfully better with an agent—not merely automatable.

## How we built it

Zingposts uses React 19 and Next.js on Netlify. Supabase Auth provides verified human sessions, Supabase Postgres holds marketplace, identity, agent-session, and workflow state, and Supabase Storage holds listing photos. Versioned SQL migrations keep direct browser access locked behind row-level security.

The browser client exposes 110 declarative tools through the WebMCP `modelContext` surface, but only five setup tools while signed out. After the person signs in, AbortSignal-managed registration keeps a compact persistent core plus one replaceable focused capability pack, so navigation never accumulates an oversized registry or silently unlocks business actions. `get_agent_bootstrap` returns setup guidance while signed out, then canonical browser-delegated identity, workspace, attention, active collaboration, capability index, and guide version after sign-in. `activate_capability` switches the focused pack without moving the person; `open_for_human_review` is optional.

The action layer derives canonical human and agent identity on the server, prevents duplicate profiles, enforces ownership and state-transition enums, creates reviewable drafts, writes attributed activity, stores inverse operations for undo, supports idempotency keys and optimistic versions, returns stable deep links and WebMCP-native structured errors, and converts consequential operations into pending confirmations. Isolated QA runs register only their own artifacts, provide an exact cleanup preview, and require human approval before deletion.

The marketplace is seeded with original project-owned imagery and realistic records so the full human-agent workflow is understandable immediately. WebMCP registration is document-scoped, while Zingposts durably stores connection profiles, scopes, alerts, boards, research, drafts, versions, and audit history. The public `/for-agents` guide and `/api/agent-guide` contract show agents how to reconnect safely without storing an invite, code, or stale catalog.

## Challenges

The main design challenge was not adding more agent power; it was deciding where that power should stop. We separated preparation from commitment. Research, organization, comparison, and drafting can proceed quickly. Communication, publication, notifications, invitations, and financial commitments pause for the human.

We also designed external-listing tracking so provenance stays honest. Zingposts can organize an outside find, but it never claims that its cached price, availability, or seller statements are authoritative.

## Accomplishments

- A coherent marketplace, not a WebMCP proof of concept
- 110 tools spanning authentication, onboarding, shared work sessions, canvas views, discovery, organization, negotiation, and multi-party trade
- Agent-first and person-first onboarding with a five-tool setup surface before human sign-in
- Durable agent-to-human-to-agent turn-taking with a unified attention queue
- Live agent activity, exact-payload approval, idempotency, dry runs, structured errors, and stable deep links
- No built-in AI or model dependency
- Supabase human authentication plus opaque invite URLs, code fallback, and single-use, expiring, revocable agent sessions—without password or session sharing
- Persistent bootstrap plus navigation-independent focused capability activation
- Structured errors, strict workflow transitions, optimistic concurrency, and namespaced QA cleanup
- Durable attribution, confirmations, and undo
- Native seller photo upload and publishing workflow
- Clear separation between owned listings and outside tracked snapshots
- Production build, automated API smoke tests, desktop browser testing, and mobile verification

## What we learned

Human-agent collaboration works best when both sides operate on the same durable objects. A board is better than a chat-only list. A research notebook is better than an ephemeral summary. A pending confirmation is better than asking the model to remember which action is sensitive. We also learned to separate document-scoped WebMCP registration, navigation-independent capability selection, durable authorization, and workspace state instead of using routes as a security or discoverability boundary.

## What's next

Next we would add real-time notification delivery, richer seller reputation checks, transport and escrow partners, stronger identity assurance, richer duplicate detection, collaborative board sharing, and signed trade-room invitations. The core safety model would remain: agents prepare and coordinate; verified people authorize commitment.

## Submission links

- Live app: `https://zingposts.com`
- Public repository: `https://github.com/leaflanellc/zingposts`
- Demo video: `ADD_PUBLIC_YOUTUBE_URL`
